-- AlterTable
ALTER TABLE `customer_collection_activities` ADD COLUMN `follow_up_resolution` VARCHAR(500) NULL,
    ADD COLUMN `follow_up_resolved_at` DATETIME(3) NULL,
    ADD COLUMN `follow_up_resolved_by_id` CHAR(36) NULL;

-- AddForeignKey
ALTER TABLE `customer_collection_activities` ADD CONSTRAINT `customer_collection_activities_follow_up_resolved_by_id_fkey` FOREIGN KEY (`follow_up_resolved_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
