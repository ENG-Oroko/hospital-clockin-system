-- Employee lifecycle metadata.
ALTER TABLE "users"
  ADD COLUMN "employment_type" VARCHAR(30) NOT NULL DEFAULT 'FULL_TIME',
  ADD COLUMN "employment_status" VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "emergency_contacts" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN "profile_metadata" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "deleted_at" TIMESTAMPTZ(6);

CREATE INDEX "users_tenant_id_employment_status_idx" ON "users"("tenant_id", "employment_status");
CREATE INDEX "users_tenant_id_deleted_at_idx" ON "users"("tenant_id", "deleted_at");

CREATE TABLE "employee_audits" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "employee_id" UUID NOT NULL,
  "actor_user_id" UUID NOT NULL,
  "action" VARCHAR(50) NOT NULL,
  "previous_value" JSONB,
  "new_value" JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "employee_audits_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "employee_audits_tenant_id_employee_id_created_at_idx"
  ON "employee_audits"("tenant_id", "employee_id", "created_at");

CREATE INDEX "employee_audits_actor_user_id_created_at_idx"
  ON "employee_audits"("actor_user_id", "created_at");

ALTER TABLE "employee_audits"
  ADD CONSTRAINT "employee_audits_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "employee_audits"
  ADD CONSTRAINT "employee_audits_employee_id_fkey"
  FOREIGN KEY ("employee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "employee_audits"
  ADD CONSTRAINT "employee_audits_actor_user_id_fkey"
  FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Shift reconciliation and overtime rule metadata.
ALTER TABLE "shift_templates"
  ADD COLUMN "grace_period_minutes" INTEGER NOT NULL DEFAULT 15,
  ADD COLUMN "early_clock_in_window_minutes" INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN "overtime_threshold_minutes" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "is_overnight" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "effective_from" DATE,
  ADD COLUMN "effective_to" DATE,
  ADD COLUMN "rules" JSONB NOT NULL DEFAULT '{}';

CREATE INDEX "shift_templates_tenant_id_is_active_idx" ON "shift_templates"("tenant_id", "is_active");

-- Assignment audit metadata and reassignment history.
DROP INDEX IF EXISTS "roster_assignments_user_id_date_key";

ALTER TABLE "roster_assignments"
  ADD COLUMN "effective_from" DATE,
  ADD COLUMN "effective_to" DATE,
  ADD COLUMN "assigned_by_user_id" UUID,
  ADD COLUMN "superseded_at" TIMESTAMPTZ(6),
  ADD COLUMN "superseded_by_assignment_id" UUID,
  ADD COLUMN "unassigned_at" TIMESTAMPTZ(6),
  ADD COLUMN "unassigned_reason" VARCHAR(255),
  ADD COLUMN "start_time_snapshot" VARCHAR(5),
  ADD COLUMN "end_time_snapshot" VARCHAR(5),
  ADD COLUMN "grace_period_snapshot" INTEGER,
  ADD COLUMN "overtime_threshold_snapshot" INTEGER,
  ADD COLUMN "overnight_snapshot" BOOLEAN;

UPDATE "roster_assignments" ra
SET
  "start_time_snapshot" = st."start_time",
  "end_time_snapshot" = st."end_time",
  "grace_period_snapshot" = st."grace_period_minutes",
  "overtime_threshold_snapshot" = st."overtime_threshold_minutes",
  "overnight_snapshot" = st."is_overnight"
FROM "shift_templates" st
WHERE ra."shift_template_id" = st."id";

ALTER TABLE "roster_assignments"
  ALTER COLUMN "start_time_snapshot" SET NOT NULL,
  ALTER COLUMN "end_time_snapshot" SET NOT NULL,
  ALTER COLUMN "grace_period_snapshot" SET NOT NULL,
  ALTER COLUMN "overtime_threshold_snapshot" SET NOT NULL,
  ALTER COLUMN "overnight_snapshot" SET NOT NULL;

WITH ranked AS (
  SELECT
    "id",
    row_number() OVER (
      PARTITION BY "tenant_id", "user_id", "date"
      ORDER BY "created_at" DESC, "id" DESC
    ) AS row_number
  FROM "roster_assignments"
  WHERE "status" <> 'CANCELLED' AND "superseded_at" IS NULL
)
UPDATE "roster_assignments" ra
SET "superseded_at" = CURRENT_TIMESTAMP,
    "status" = 'REASSIGNED'
FROM ranked
WHERE ra."id" = ranked."id" AND ranked.row_number > 1;

CREATE INDEX "roster_assignments_tenant_id_user_id_date_idx" ON "roster_assignments"("tenant_id", "user_id", "date");
CREATE INDEX "roster_assignments_tenant_id_user_id_date_status_idx" ON "roster_assignments"("tenant_id", "user_id", "date", "status");
CREATE INDEX "roster_assignments_tenant_id_user_id_date_superseded_at_idx" ON "roster_assignments"("tenant_id", "user_id", "date", "superseded_at");
CREATE UNIQUE INDEX "roster_assignments_one_active_assignment_key"
  ON "roster_assignments"("tenant_id", "user_id", "date")
  WHERE "superseded_at" IS NULL AND "status" <> 'CANCELLED';

CREATE TABLE "roster_assignment_histories" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "roster_assignment_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "previous_shift_template_id" UUID,
  "new_shift_template_id" UUID,
  "previous_department_id" UUID,
  "new_department_id" UUID,
  "previous_status" VARCHAR(30),
  "new_status" VARCHAR(30) NOT NULL,
  "effective_date" DATE NOT NULL,
  "action" VARCHAR(30) NOT NULL,
  "reason" VARCHAR(255),
  "actor_user_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "roster_assignment_histories_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "roster_assignment_histories_tenant_id_user_id_effective_date_idx"
  ON "roster_assignment_histories"("tenant_id", "user_id", "effective_date");

CREATE INDEX "roster_assignment_histories_roster_assignment_id_idx"
  ON "roster_assignment_histories"("roster_assignment_id");

ALTER TABLE "roster_assignment_histories"
  ADD CONSTRAINT "roster_assignment_histories_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "roster_assignment_histories"
  ADD CONSTRAINT "roster_assignment_histories_roster_assignment_id_fkey"
  FOREIGN KEY ("roster_assignment_id") REFERENCES "roster_assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "roster_assignment_histories"
  ADD CONSTRAINT "roster_assignment_histories_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "roster_assignment_histories"
  ADD CONSTRAINT "roster_assignment_histories_new_shift_template_id_fkey"
  FOREIGN KEY ("new_shift_template_id") REFERENCES "shift_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Preserve roster, attendance, reconciliation, and payroll evidence by preventing
-- destructive cascades through roster ownership relations.
ALTER TABLE "roster_assignments" DROP CONSTRAINT IF EXISTS "roster_assignments_user_id_fkey";
ALTER TABLE "roster_assignments" DROP CONSTRAINT IF EXISTS "roster_assignments_department_id_fkey";
ALTER TABLE "roster_assignments" DROP CONSTRAINT IF EXISTS "roster_assignments_shift_template_id_fkey";

ALTER TABLE "roster_assignments"
  ADD CONSTRAINT "roster_assignments_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "roster_assignments"
  ADD CONSTRAINT "roster_assignments_department_id_fkey"
  FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "roster_assignments"
  ADD CONSTRAINT "roster_assignments_shift_template_id_fkey"
  FOREIGN KEY ("shift_template_id") REFERENCES "shift_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
