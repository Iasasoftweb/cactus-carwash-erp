-- AlterTable
ALTER TABLE `kitchen_ticket_items` ADD COLUMN `cancellation_reason` VARCHAR(255) NULL,
    ADD COLUMN `cancelled_at` DATETIME(3) NULL;
