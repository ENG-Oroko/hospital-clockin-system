/*
  Warnings:

  - You are about to drop the column `adminUserId` on the `attendance_audits` table. All the data in the column will be lost.
  - You are about to drop the column `attendanceLogId` on the `attendance_audits` table. All the data in the column will be lost.
  - You are about to drop the column `changedAt` on the `attendance_audits` table. All the data in the column will be lost.
  - You are about to drop the column `correctedAction` on the `attendance_audits` table. All the data in the column will be lost.
  - You are about to drop the column `originalAction` on the `attendance_audits` table. All the data in the column will be lost.
  - You are about to drop the column `reasonForChange` on the `attendance_audits` table. All the data in the column will be lost.
  - You are about to drop the column `actionDetected` on the `attendance_logs` table. All the data in the column will be lost.
  - You are about to drop the column `deviceId` on the `attendance_logs` table. All the data in the column will be lost.
  - You are about to drop the column `isDeduplicated` on the `attendance_logs` table. All the data in the column will be lost.
  - You are about to drop the column `processedAt` on the `attendance_logs` table. All the data in the column will be lost.
  - You are about to drop the column `tenantId` on the `attendance_logs` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `attendance_logs` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `departments` table. All the data in the column will be lost.
  - You are about to drop the column `tenantId` on the `departments` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `departments` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `roster_assignments` table. All the data in the column will be lost.
  - You are about to drop the column `departmentId` on the `roster_assignments` table. All the data in the column will be lost.
  - You are about to drop the column `shiftTemplateId` on the `roster_assignments` table. All the data in the column will be lost.
  - You are about to drop the column `tenantId` on the `roster_assignments` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `roster_assignments` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `roster_assignments` table. All the data in the column will be lost.
  - The `status` column on the `roster_assignments` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `createdAt` on the `shift_templates` table. All the data in the column will be lost.
  - You are about to drop the column `endTime` on the `shift_templates` table. All the data in the column will be lost.
  - You are about to drop the column `gracePeriodMinutes` on the `shift_templates` table. All the data in the column will be lost.
  - You are about to drop the column `startTime` on the `shift_templates` table. All the data in the column will be lost.
  - You are about to drop the column `tenantId` on the `shift_templates` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `shift_templates` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `tenants` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `tenants` table. All the data in the column will be lost.
  - You are about to drop the column `licenseKey` on the `tenants` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `tenants` table. All the data in the column will be lost.
  - You are about to drop the column `biometricUserId` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `departmentId` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `firstName` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `lastName` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `passwordHash` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `tenantId` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `users` table. All the data in the column will be lost.
  - The `role` column on the `users` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[user_id,device_id,direction,timestamp]` on the table `attendance_logs` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tenant_id,code]` on the table `departments` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[user_id,date]` on the table `roster_assignments` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tenant_id,email]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tenant_id,payroll_number]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tenant_id,device_pin]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `action_type` to the `attendance_audits` table without a default value. This is not possible if the table is not empty.
  - Added the required column `justification` to the `attendance_audits` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenant_id` to the `attendance_audits` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `attendance_audits` table without a default value. This is not possible if the table is not empty.
  - Added the required column `device_id` to the `attendance_logs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `direction` to the `attendance_logs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenant_id` to the `attendance_logs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `attendance_logs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenant_id` to the `departments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `departments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `department_id` to the `roster_assignments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `shift_template_id` to the `roster_assignments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenant_id` to the `roster_assignments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `roster_assignments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `roster_assignments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `end_time` to the `shift_templates` table without a default value. This is not possible if the table is not empty.
  - Added the required column `start_time` to the `shift_templates` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenant_id` to the `shift_templates` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `shift_templates` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `type` on the `shift_templates` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `license_key` to the `tenants` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `tenants` table without a default value. This is not possible if the table is not empty.
  - Added the required column `device_pin` to the `users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `first_name` to the `users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `last_name` to the `users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `password_hash` to the `users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `payroll_number` to the `users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenant_id` to the `users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "attendance_audits" DROP CONSTRAINT "attendance_audits_adminUserId_fkey";

-- DropForeignKey
ALTER TABLE "attendance_audits" DROP CONSTRAINT "attendance_audits_attendanceLogId_fkey";

-- DropForeignKey
ALTER TABLE "attendance_logs" DROP CONSTRAINT "attendance_logs_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "attendance_logs" DROP CONSTRAINT "attendance_logs_userId_fkey";

-- DropForeignKey
ALTER TABLE "departments" DROP CONSTRAINT "departments_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "roster_assignments" DROP CONSTRAINT "roster_assignments_departmentId_fkey";

-- DropForeignKey
ALTER TABLE "roster_assignments" DROP CONSTRAINT "roster_assignments_shiftTemplateId_fkey";

-- DropForeignKey
ALTER TABLE "roster_assignments" DROP CONSTRAINT "roster_assignments_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "roster_assignments" DROP CONSTRAINT "roster_assignments_userId_fkey";

-- DropForeignKey
ALTER TABLE "shift_templates" DROP CONSTRAINT "shift_templates_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_departmentId_fkey";

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_tenantId_fkey";

-- DropIndex
DROP INDEX "attendance_audits_attendanceLogId_idx";

-- DropIndex
DROP INDEX "attendance_logs_tenantId_idx";

-- DropIndex
DROP INDEX "attendance_logs_userId_timestamp_idx";

-- DropIndex
DROP INDEX "departments_tenantId_code_key";

-- DropIndex
DROP INDEX "departments_tenantId_idx";

-- DropIndex
DROP INDEX "roster_assignments_date_idx";

-- DropIndex
DROP INDEX "roster_assignments_departmentId_idx";

-- DropIndex
DROP INDEX "roster_assignments_tenantId_idx";

-- DropIndex
DROP INDEX "roster_assignments_userId_date_key";

-- DropIndex
DROP INDEX "shift_templates_tenantId_idx";

-- DropIndex
DROP INDEX "shift_templates_tenantId_name_key";

-- DropIndex
DROP INDEX "users_biometricUserId_idx";

-- DropIndex
DROP INDEX "users_email_key";

-- DropIndex
DROP INDEX "users_tenantId_biometricUserId_key";

-- DropIndex
DROP INDEX "users_tenantId_idx";

-- AlterTable
ALTER TABLE "attendance_audits" DROP COLUMN "adminUserId",
DROP COLUMN "attendanceLogId",
DROP COLUMN "changedAt",
DROP COLUMN "correctedAction",
DROP COLUMN "originalAction",
DROP COLUMN "reasonForChange",
ADD COLUMN     "action_type" VARCHAR(50) NOT NULL,
ADD COLUMN     "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "justification" TEXT NOT NULL,
ADD COLUMN     "target_log_id" UUID,
ADD COLUMN     "tenant_id" UUID NOT NULL,
ADD COLUMN     "user_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "attendance_logs" DROP COLUMN "actionDetected",
DROP COLUMN "deviceId",
DROP COLUMN "isDeduplicated",
DROP COLUMN "processedAt",
DROP COLUMN "tenantId",
DROP COLUMN "userId",
ADD COLUMN     "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "device_id" UUID NOT NULL,
ADD COLUMN     "direction" VARCHAR(10) NOT NULL,
ADD COLUMN     "roster_assignment_id" UUID,
ADD COLUMN     "tenant_id" UUID NOT NULL,
ADD COLUMN     "user_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "departments" DROP COLUMN "createdAt",
DROP COLUMN "tenantId",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "rules" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "tenant_id" UUID NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMPTZ(6) NOT NULL;

-- AlterTable
ALTER TABLE "roster_assignments" DROP COLUMN "createdAt",
DROP COLUMN "departmentId",
DROP COLUMN "shiftTemplateId",
DROP COLUMN "tenantId",
DROP COLUMN "updatedAt",
DROP COLUMN "userId",
ADD COLUMN     "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "department_id" UUID NOT NULL,
ADD COLUMN     "overridden_hourly_rate" DECIMAL(12,2),
ADD COLUMN     "shift_template_id" UUID NOT NULL,
ADD COLUMN     "tenant_id" UUID NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMPTZ(6) NOT NULL,
ADD COLUMN     "user_id" UUID NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" VARCHAR(30) NOT NULL DEFAULT 'UNVERIFIED';

-- AlterTable
ALTER TABLE "shift_templates" DROP COLUMN "createdAt",
DROP COLUMN "endTime",
DROP COLUMN "gracePeriodMinutes",
DROP COLUMN "startTime",
DROP COLUMN "tenantId",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "end_time" VARCHAR(5) NOT NULL,
ADD COLUMN     "start_time" VARCHAR(5) NOT NULL,
ADD COLUMN     "tenant_id" UUID NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMPTZ(6) NOT NULL,
DROP COLUMN "type",
ADD COLUMN     "type" VARCHAR(30) NOT NULL;

-- AlterTable
ALTER TABLE "tenants" DROP COLUMN "createdAt",
DROP COLUMN "isActive",
DROP COLUMN "licenseKey",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "license_key" VARCHAR(255) NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMPTZ(6) NOT NULL;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "biometricUserId",
DROP COLUMN "createdAt",
DROP COLUMN "departmentId",
DROP COLUMN "firstName",
DROP COLUMN "isActive",
DROP COLUMN "lastName",
DROP COLUMN "passwordHash",
DROP COLUMN "tenantId",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "department_id" UUID,
ADD COLUMN     "device_pin" VARCHAR(50) NOT NULL,
ADD COLUMN     "first_name" VARCHAR(100) NOT NULL,
ADD COLUMN     "hourly_rate" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "last_name" VARCHAR(100) NOT NULL,
ADD COLUMN     "password_hash" VARCHAR(255) NOT NULL,
ADD COLUMN     "payroll_number" VARCHAR(50) NOT NULL,
ADD COLUMN     "phone_number" VARCHAR(30),
ADD COLUMN     "tenant_id" UUID NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMPTZ(6) NOT NULL,
DROP COLUMN "role",
ADD COLUMN     "role" VARCHAR(30) NOT NULL DEFAULT 'EMPLOYEE';

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
    "channel" VARCHAR(20) NOT NULL,
    "recipient" VARCHAR(255) NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "body" TEXT NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id")
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
CREATE UNIQUE INDEX "system_settings_tenant_id_key" ON "system_settings"("tenant_id");

-- CreateIndex
CREATE INDEX "attendance_audits_tenant_id_idx" ON "attendance_audits"("tenant_id");

-- CreateIndex
CREATE INDEX "attendance_logs_tenant_id_timestamp_idx" ON "attendance_logs"("tenant_id", "timestamp");

-- CreateIndex
CREATE INDEX "attendance_logs_user_id_idx" ON "attendance_logs"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_logs_user_id_device_id_direction_timestamp_key" ON "attendance_logs"("user_id", "device_id", "direction", "timestamp");

-- CreateIndex
CREATE INDEX "departments_tenant_id_idx" ON "departments"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "departments_tenant_id_code_key" ON "departments"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "roster_assignments_tenant_id_date_idx" ON "roster_assignments"("tenant_id", "date");

-- CreateIndex
CREATE INDEX "roster_assignments_department_id_date_idx" ON "roster_assignments"("department_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "roster_assignments_user_id_date_key" ON "roster_assignments"("user_id", "date");

-- CreateIndex
CREATE INDEX "shift_templates_tenant_id_idx" ON "shift_templates"("tenant_id");

-- CreateIndex
CREATE INDEX "users_tenant_id_idx" ON "users"("tenant_id");

-- CreateIndex
CREATE INDEX "users_department_id_idx" ON "users"("department_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_tenant_id_email_key" ON "users"("tenant_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "users_tenant_id_payroll_number_key" ON "users"("tenant_id", "payroll_number");

-- CreateIndex
CREATE UNIQUE INDEX "users_tenant_id_device_pin_key" ON "users"("tenant_id", "device_pin");

-- AddForeignKey
ALTER TABLE "attendance_logs" ADD CONSTRAINT "attendance_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_logs" ADD CONSTRAINT "attendance_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_logs" ADD CONSTRAINT "attendance_logs_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_logs" ADD CONSTRAINT "attendance_logs_roster_assignment_id_fkey" FOREIGN KEY ("roster_assignment_id") REFERENCES "roster_assignments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_audits" ADD CONSTRAINT "attendance_audits_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_audits" ADD CONSTRAINT "attendance_audits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devices" ADD CONSTRAINT "devices_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_periods" ADD CONSTRAINT "payroll_periods_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "payroll_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reconciliation_logs" ADD CONSTRAINT "reconciliation_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reconciliation_logs" ADD CONSTRAINT "reconciliation_logs_roster_assignment_id_fkey" FOREIGN KEY ("roster_assignment_id") REFERENCES "roster_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compiled_reports" ADD CONSTRAINT "compiled_reports_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compiled_reports" ADD CONSTRAINT "compiled_reports_generated_by_id_fkey" FOREIGN KEY ("generated_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_templates" ADD CONSTRAINT "shift_templates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roster_assignments" ADD CONSTRAINT "roster_assignments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roster_assignments" ADD CONSTRAINT "roster_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roster_assignments" ADD CONSTRAINT "roster_assignments_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roster_assignments" ADD CONSTRAINT "roster_assignments_shift_template_id_fkey" FOREIGN KEY ("shift_template_id") REFERENCES "shift_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
