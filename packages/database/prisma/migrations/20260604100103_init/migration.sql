-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'LATE', 'ABSENT', 'HALF_DAY', 'ON_LEAVE', 'UNROSTERED', 'HOLIDAY');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'DEPARTMENT_HEAD', 'STAFF', 'EDGE_GATEWAY');

-- CreateEnum
CREATE TYPE "ClockAction" AS ENUM ('IN', 'OUT', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ShiftStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'LEAVE', 'GHOST_SESSION');

-- CreateEnum
CREATE TYPE "ShiftType" AS ENUM ('MORNING', 'AFTERNOON', 'NIGHT', 'CUSTOM');

-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL', 'SMS', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "NotificationPriority" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "NotificationTriggerEvent" AS ENUM ('CLOCK_IN', 'CLOCK_OUT', 'LATE_IN', 'EARLY_OUT', 'MISSED_PUNCH', 'MISSED_BREAK', 'OVERTIME_APPROACHING', 'OVERTIME_RECORDED', 'LEAVE_REQUEST_CREATED', 'LEAVE_REQUEST_APPROVED', 'LEAVE_REQUEST_REJECTED', 'SHIFT_ASSIGNED', 'SHIFT_CHANGED', 'SHIFT_SWAP_REQUESTED', 'OPEN_SHIFT_BID', 'TIMECARD_EDITED', 'SCHEDULE_POSTED', 'CLOCK_IN_REMINDER', 'UNSUBMITTED_TIMESHEET', 'INTEGRATION_FAILED');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'DEPT_HEAD', 'EMPLOYEE');

-- CreateTable
CREATE TABLE "attendance_logs" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "device_id" UUID NOT NULL,
    "roster_assignment_id" UUID,
    "direction" VARCHAR(10) NOT NULL,
    "timestamp" TIMESTAMPTZ(6) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "summaryId" UUID,

    CONSTRAINT "attendance_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_summary" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "firstIn" TIMESTAMPTZ(6),
    "lastOut" TIMESTAMPTZ(6),
    "totalHours" REAL,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'ABSENT',
    "shift_id" UUID,
    "shiftName" VARCHAR(100),
    "scheduledStart" TIMESTAMPTZ(6),
    "scheduledEnd" TIMESTAMPTZ(6),
    "scheduledHours" REAL,
    "lateMinutes" INTEGER NOT NULL DEFAULT 0,
    "overtimeHours" REAL NOT NULL DEFAULT 0,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reprocessedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_summary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_audits" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "targetSummaryId" UUID,
    "targetLogId" UUID,
    "actionType" VARCHAR(50) NOT NULL,
    "justification" TEXT NOT NULL,
    "oldValues" JSONB,
    "newValues" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_audits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "rules" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "devices" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "serial_code" VARCHAR(100) NOT NULL,
    "ip_address" VARCHAR(45),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_requests" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "leave_type" VARCHAR(50) NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "reason" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "approved_by_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "leave_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_logs" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "recipient" VARCHAR(255) NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "body" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "priority" "NotificationPriority" NOT NULL DEFAULT 'MEDIUM',
    "trigger_event" "NotificationTriggerEvent",
    "actions" JSONB,
    "metadata" JSONB,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "error_message" VARCHAR(500),
    "sent_at" TIMESTAMPTZ(6),
    "delivered_at" TIMESTAMPTZ(6),
    "read_at" TIMESTAMPTZ(6),
    "expires_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "event" "NotificationTriggerEvent" NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_notification_settings" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "quiet_hours_enabled" BOOLEAN NOT NULL DEFAULT false,
    "quiet_hours_start" VARCHAR(5) DEFAULT '22:00',
    "quiet_hours_end" VARCHAR(5) DEFAULT '07:00',
    "digest_enabled" BOOLEAN NOT NULL DEFAULT true,
    "digest_frequency" VARCHAR(20) DEFAULT 'daily',
    "email_digest" BOOLEAN NOT NULL DEFAULT true,
    "push_digest" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "user_notification_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_digests" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "body" TEXT NOT NULL,
    "items" JSONB NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "sent_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_digests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_templates" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "event" "NotificationTriggerEvent" NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "body" TEXT NOT NULL,
    "actions" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_rate_limits" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "event" "NotificationTriggerEvent" NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "window_start" TIMESTAMPTZ(6) NOT NULL,
    "window_end" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_rate_limits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_periods" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "external_system" VARCHAR(50),
    "synchronized_at" TIMESTAMPTZ(6),

    CONSTRAINT "payroll_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payslips" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "period_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "hourly_rate" DECIMAL(12,2) NOT NULL,
    "regular_hours_worked" DECIMAL(8,2) NOT NULL,
    "overtime_hours_worked" DECIMAL(8,2) NOT NULL DEFAULT 0.00,
    "night_hours_worked" DECIMAL(8,2) NOT NULL DEFAULT 0.00,
    "base_salary" DECIMAL(12,2) NOT NULL,
    "overtime_pay" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "allowances" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "total_gross" DECIMAL(12,2) NOT NULL,
    "total_deductions" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "net_pay" DECIMAL(12,2) NOT NULL,
    "deductions_breakdown" JSONB NOT NULL,
    "allowances_breakdown" JSONB NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'UNPAID',
    "paid_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "payslips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reconciliation_logs" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "roster_assignment_id" UUID NOT NULL,
    "clock_in_time" TIMESTAMPTZ(6),
    "clock_out_time" TIMESTAMPTZ(6),
    "calculated_base_hours" DECIMAL(6,2) NOT NULL DEFAULT 0.00,
    "calculated_overtime" DECIMAL(6,2) NOT NULL DEFAULT 0.00,
    "calculated_night_shift" DECIMAL(6,2) NOT NULL DEFAULT 0.00,
    "is_flagged" BOOLEAN NOT NULL DEFAULT false,
    "exception_reason" VARCHAR(255),
    "is_resolved" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "reconciliation_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compiled_reports" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "report_type" VARCHAR(50) NOT NULL,
    "generated_by_id" UUID NOT NULL,
    "date_range_start" DATE NOT NULL,
    "date_range_end" DATE NOT NULL,
    "compiled_data" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "compiled_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shift_templates" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "type" VARCHAR(30) NOT NULL,
    "start_time" VARCHAR(5) NOT NULL,
    "end_time" VARCHAR(5) NOT NULL,
    "grace_period_minutes" INTEGER NOT NULL DEFAULT 15,
    "early_clock_in_window_minutes" INTEGER NOT NULL DEFAULT 30,
    "overtime_threshold_minutes" INTEGER NOT NULL DEFAULT 0,
    "is_overnight" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "effective_from" DATE,
    "effective_to" DATE,
    "rules" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "shift_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roster_assignments" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "department_id" UUID NOT NULL,
    "shift_template_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "overridden_hourly_rate" DECIMAL(12,2),
    "status" VARCHAR(30) NOT NULL DEFAULT 'UNVERIFIED',
    "effective_from" DATE,
    "effective_to" DATE,
    "assigned_by_user_id" UUID,
    "superseded_at" TIMESTAMPTZ(6),
    "superseded_by_assignment_id" UUID,
    "unassigned_at" TIMESTAMPTZ(6),
    "unassigned_reason" VARCHAR(255),
    "start_time_snapshot" VARCHAR(5) NOT NULL,
    "end_time_snapshot" VARCHAR(5) NOT NULL,
    "grace_period_snapshot" INTEGER NOT NULL,
    "overtime_threshold_snapshot" INTEGER NOT NULL,
    "overnight_snapshot" BOOLEAN NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "roster_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
CREATE TABLE "system_settings" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "attendance_rules" JSONB NOT NULL,
    "holiday_calendar" JSONB NOT NULL,
    "salary_rules" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenants" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "subdomain" VARCHAR(100) NOT NULL,
    "license_key" VARCHAR(255) NOT NULL,
    "slug" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "department_id" UUID,
    "payroll_number" VARCHAR(50) NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "phone_number" VARCHAR(30),
    "password_hash" VARCHAR(255) NOT NULL,
    "role" VARCHAR(30) NOT NULL DEFAULT 'EMPLOYEE',
    "hourly_rate" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "employment_type" VARCHAR(30) NOT NULL DEFAULT 'FULL_TIME',
    "employment_status" VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    "device_pin" VARCHAR(50) NOT NULL,
    "emergency_contacts" JSONB NOT NULL DEFAULT '[]',
    "profile_metadata" JSONB NOT NULL DEFAULT '{}',
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateIndex
CREATE INDEX "attendance_logs_tenant_id_timestamp_idx" ON "attendance_logs"("tenant_id", "timestamp");

-- CreateIndex
CREATE INDEX "attendance_logs_user_id_idx" ON "attendance_logs"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_logs_user_id_device_id_direction_timestamp_key" ON "attendance_logs"("user_id", "device_id", "direction", "timestamp");

-- CreateIndex
CREATE INDEX "attendance_summary_tenant_id_date_idx" ON "attendance_summary"("tenant_id", "date");

-- CreateIndex
CREATE INDEX "attendance_summary_tenant_id_user_id_date_idx" ON "attendance_summary"("tenant_id", "user_id", "date");

-- CreateIndex
CREATE INDEX "attendance_summary_status_idx" ON "attendance_summary"("status");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_summary_user_id_date_key" ON "attendance_summary"("user_id", "date");

-- CreateIndex
CREATE INDEX "attendance_audits_tenant_id_idx" ON "attendance_audits"("tenant_id");

-- CreateIndex
CREATE INDEX "attendance_audits_targetSummaryId_idx" ON "attendance_audits"("targetSummaryId");

-- CreateIndex
CREATE INDEX "departments_tenant_id_idx" ON "departments"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "departments_tenant_id_code_key" ON "departments"("tenant_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "devices_serial_code_key" ON "devices"("serial_code");

-- CreateIndex
CREATE INDEX "devices_tenant_id_idx" ON "devices"("tenant_id");

-- CreateIndex
CREATE INDEX "leave_requests_tenant_id_idx" ON "leave_requests"("tenant_id");

-- CreateIndex
CREATE INDEX "leave_requests_employee_id_idx" ON "leave_requests"("employee_id");

-- CreateIndex
CREATE INDEX "notification_logs_tenant_id_idx" ON "notification_logs"("tenant_id");

-- CreateIndex
CREATE INDEX "notification_logs_user_id_idx" ON "notification_logs"("user_id");

-- CreateIndex
CREATE INDEX "notification_logs_tenant_id_status_idx" ON "notification_logs"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "notification_logs_tenant_id_priority_idx" ON "notification_logs"("tenant_id", "priority");

-- CreateIndex
CREATE INDEX "notification_logs_trigger_event_idx" ON "notification_logs"("trigger_event");

-- CreateIndex
CREATE INDEX "notification_logs_expires_at_idx" ON "notification_logs"("expires_at");

-- CreateIndex
CREATE INDEX "notification_logs_created_at_idx" ON "notification_logs"("created_at");

-- CreateIndex
CREATE INDEX "notification_preferences_tenant_id_user_id_idx" ON "notification_preferences"("tenant_id", "user_id");

-- CreateIndex
CREATE INDEX "notification_preferences_event_idx" ON "notification_preferences"("event");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_tenant_id_user_id_event_channel_key" ON "notification_preferences"("tenant_id", "user_id", "event", "channel");

-- CreateIndex
CREATE UNIQUE INDEX "user_notification_settings_user_id_key" ON "user_notification_settings"("user_id");

-- CreateIndex
CREATE INDEX "user_notification_settings_tenant_id_user_id_idx" ON "user_notification_settings"("tenant_id", "user_id");

-- CreateIndex
CREATE INDEX "notification_digests_tenant_id_user_id_idx" ON "notification_digests"("tenant_id", "user_id");

-- CreateIndex
CREATE INDEX "notification_digests_status_idx" ON "notification_digests"("status");

-- CreateIndex
CREATE INDEX "notification_templates_tenant_id_event_idx" ON "notification_templates"("tenant_id", "event");

-- CreateIndex
CREATE UNIQUE INDEX "notification_templates_tenant_id_event_channel_key" ON "notification_templates"("tenant_id", "event", "channel");

-- CreateIndex
CREATE INDEX "notification_rate_limits_tenant_id_user_id_event_idx" ON "notification_rate_limits"("tenant_id", "user_id", "event");

-- CreateIndex
CREATE UNIQUE INDEX "notification_rate_limits_tenant_id_user_id_event_window_sta_key" ON "notification_rate_limits"("tenant_id", "user_id", "event", "window_start");

-- CreateIndex
CREATE INDEX "payroll_periods_tenant_id_idx" ON "payroll_periods"("tenant_id");

-- CreateIndex
CREATE INDEX "payslips_tenant_id_idx" ON "payslips"("tenant_id");

-- CreateIndex
CREATE INDEX "payslips_employee_id_idx" ON "payslips"("employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "reconciliation_logs_roster_assignment_id_key" ON "reconciliation_logs"("roster_assignment_id");

-- CreateIndex
CREATE INDEX "reconciliation_logs_tenant_id_idx" ON "reconciliation_logs"("tenant_id");

-- CreateIndex
CREATE INDEX "compiled_reports_tenant_id_report_type_idx" ON "compiled_reports"("tenant_id", "report_type");

-- CreateIndex
CREATE INDEX "shift_templates_tenant_id_idx" ON "shift_templates"("tenant_id");

-- CreateIndex
CREATE INDEX "shift_templates_tenant_id_is_active_idx" ON "shift_templates"("tenant_id", "is_active");

-- CreateIndex
CREATE INDEX "roster_assignments_tenant_id_date_idx" ON "roster_assignments"("tenant_id", "date");

-- CreateIndex
CREATE INDEX "roster_assignments_tenant_id_user_id_date_idx" ON "roster_assignments"("tenant_id", "user_id", "date");

-- CreateIndex
CREATE INDEX "roster_assignments_tenant_id_user_id_date_status_idx" ON "roster_assignments"("tenant_id", "user_id", "date", "status");

-- CreateIndex
CREATE INDEX "roster_assignments_tenant_id_user_id_date_superseded_at_idx" ON "roster_assignments"("tenant_id", "user_id", "date", "superseded_at");

-- CreateIndex
CREATE INDEX "roster_assignments_department_id_date_idx" ON "roster_assignments"("department_id", "date");

-- CreateIndex
CREATE INDEX "roster_assignment_histories_tenant_id_user_id_effective_dat_idx" ON "roster_assignment_histories"("tenant_id", "user_id", "effective_date");

-- CreateIndex
CREATE INDEX "roster_assignment_histories_roster_assignment_id_idx" ON "roster_assignment_histories"("roster_assignment_id");

-- CreateIndex
CREATE UNIQUE INDEX "system_settings_tenant_id_key" ON "system_settings"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_subdomain_key" ON "tenants"("subdomain");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE INDEX "tenants_subdomain_idx" ON "tenants"("subdomain");

-- CreateIndex
CREATE INDEX "users_tenant_id_idx" ON "users"("tenant_id");

-- CreateIndex
CREATE INDEX "users_department_id_idx" ON "users"("department_id");

-- CreateIndex
CREATE INDEX "users_tenant_id_employment_status_idx" ON "users"("tenant_id", "employment_status");

-- CreateIndex
CREATE INDEX "users_tenant_id_deleted_at_idx" ON "users"("tenant_id", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "users_tenant_id_email_key" ON "users"("tenant_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "users_tenant_id_payroll_number_key" ON "users"("tenant_id", "payroll_number");

-- CreateIndex
CREATE UNIQUE INDEX "users_tenant_id_device_pin_key" ON "users"("tenant_id", "device_pin");

-- CreateIndex
CREATE INDEX "employee_audits_tenant_id_employee_id_created_at_idx" ON "employee_audits"("tenant_id", "employee_id", "created_at");

-- CreateIndex
CREATE INDEX "employee_audits_actor_user_id_created_at_idx" ON "employee_audits"("actor_user_id", "created_at");

-- AddForeignKey
ALTER TABLE "attendance_logs" ADD CONSTRAINT "attendance_logs_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_logs" ADD CONSTRAINT "attendance_logs_roster_assignment_id_fkey" FOREIGN KEY ("roster_assignment_id") REFERENCES "roster_assignments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_logs" ADD CONSTRAINT "attendance_logs_summaryId_fkey" FOREIGN KEY ("summaryId") REFERENCES "attendance_summary"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_logs" ADD CONSTRAINT "attendance_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_logs" ADD CONSTRAINT "attendance_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_summary" ADD CONSTRAINT "attendance_summary_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "shift_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_summary" ADD CONSTRAINT "attendance_summary_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_summary" ADD CONSTRAINT "attendance_summary_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_audits" ADD CONSTRAINT "attendance_audits_targetSummaryId_fkey" FOREIGN KEY ("targetSummaryId") REFERENCES "attendance_summary"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_audits" ADD CONSTRAINT "attendance_audits_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_audits" ADD CONSTRAINT "attendance_audits_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devices" ADD CONSTRAINT "devices_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_notification_settings" ADD CONSTRAINT "user_notification_settings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_notification_settings" ADD CONSTRAINT "user_notification_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_digests" ADD CONSTRAINT "notification_digests_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_digests" ADD CONSTRAINT "notification_digests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_templates" ADD CONSTRAINT "notification_templates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_rate_limits" ADD CONSTRAINT "notification_rate_limits_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_rate_limits" ADD CONSTRAINT "notification_rate_limits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_periods" ADD CONSTRAINT "payroll_periods_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "payroll_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reconciliation_logs" ADD CONSTRAINT "reconciliation_logs_roster_assignment_id_fkey" FOREIGN KEY ("roster_assignment_id") REFERENCES "roster_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reconciliation_logs" ADD CONSTRAINT "reconciliation_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compiled_reports" ADD CONSTRAINT "compiled_reports_generated_by_id_fkey" FOREIGN KEY ("generated_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compiled_reports" ADD CONSTRAINT "compiled_reports_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_templates" ADD CONSTRAINT "shift_templates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roster_assignments" ADD CONSTRAINT "roster_assignments_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roster_assignments" ADD CONSTRAINT "roster_assignments_shift_template_id_fkey" FOREIGN KEY ("shift_template_id") REFERENCES "shift_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roster_assignments" ADD CONSTRAINT "roster_assignments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roster_assignments" ADD CONSTRAINT "roster_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roster_assignment_histories" ADD CONSTRAINT "roster_assignment_histories_new_shift_template_id_fkey" FOREIGN KEY ("new_shift_template_id") REFERENCES "shift_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roster_assignment_histories" ADD CONSTRAINT "roster_assignment_histories_roster_assignment_id_fkey" FOREIGN KEY ("roster_assignment_id") REFERENCES "roster_assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roster_assignment_histories" ADD CONSTRAINT "roster_assignment_histories_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roster_assignment_histories" ADD CONSTRAINT "roster_assignment_histories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_audits" ADD CONSTRAINT "employee_audits_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_audits" ADD CONSTRAINT "employee_audits_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_audits" ADD CONSTRAINT "employee_audits_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
