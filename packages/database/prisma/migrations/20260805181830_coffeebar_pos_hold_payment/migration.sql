/*
  Warnings:

  - You are about to drop the column `ready_to_pay_at` on the `pos_accounts` table. All the data in the column will be lost.
  - The values [READY_TO_PAY] on the enum `pos_accounts_status` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterTable
ALTER TABLE `pos_accounts` DROP COLUMN `ready_to_pay_at`,
    ADD COLUMN `paid_at` DATETIME(3) NULL,
    ADD COLUMN `payment_method_id` CHAR(36) NULL,
    ADD COLUMN `payment_reference` VARCHAR(120) NULL,
    MODIFY `status` ENUM('OPEN', 'PAID', 'CANCELLED') NOT NULL DEFAULT 'OPEN';

-- AddForeignKey
ALTER TABLE `pos_accounts` ADD CONSTRAINT `pos_accounts_payment_method_id_fkey` FOREIGN KEY (`payment_method_id`) REFERENCES `payment_methods`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
