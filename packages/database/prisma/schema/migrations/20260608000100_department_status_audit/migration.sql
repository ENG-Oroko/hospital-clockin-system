ALTER TABLE "departments" ADD COLUMN "status" VARCHAR(30) NOT NULL DEFAULT 'ACTIVE';

CREATE TABLE "department_audits" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "department_id" UUID NOT NULL,
    "actor_user_id" UUID,
    "action" VARCHAR(50) NOT NULL,
    "previous_value" JSONB,
    "new_value" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "department_audits_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "departments_tenant_id_status_idx" ON "departments"("tenant_id", "status");
CREATE INDEX "department_audits_tenant_id_department_id_created_at_idx" ON "department_audits"("tenant_id", "department_id", "created_at");
CREATE INDEX "department_audits_actor_user_id_created_at_idx" ON "department_audits"("actor_user_id", "created_at");

ALTER TABLE "department_audits" ADD CONSTRAINT "department_audits_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "department_audits" ADD CONSTRAINT "department_audits_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "department_audits" ADD CONSTRAINT "department_audits_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
