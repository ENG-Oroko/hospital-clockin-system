-- AlterTable
ALTER TABLE "departments" ADD COLUMN     "cost_center_code" VARCHAR(50),
ADD COLUMN     "parent_id" UUID;

-- CreateIndex
CREATE INDEX "departments_parent_id_idx" ON "departments"("parent_id");

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
