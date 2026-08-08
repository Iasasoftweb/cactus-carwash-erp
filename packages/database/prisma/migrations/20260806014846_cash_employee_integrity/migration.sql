/*
  Warnings:

  - Added the required column `cashier_name_snapshot` to the `cash_sessions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `employee_id` to the `cash_sessions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `cash_movements` ADD COLUMN `beneficiary` VARCHAR(160) NULL,
    ADD COLUMN `external_reference` VARCHAR(120) NULL;

-- AlterTable
ALTER TABLE `cash_sessions` ADD COLUMN `cashier_name_snapshot` VARCHAR(160) NOT NULL,
    ADD COLUMN `employee_id` CHAR(36) NOT NULL;

-- AlterTable
ALTER TABLE `employees` ADD COLUMN `can_operate_cash` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `job_position` VARCHAR(100) NULL;

-- CreateIndex
CREATE INDEX `cash_sessions_employee_id_opened_at_idx` ON `cash_sessions`(`employee_id`, `opened_at`);

-- AddForeignKey
ALTER TABLE `cash_sessions` ADD CONSTRAINT `cash_sessions_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
