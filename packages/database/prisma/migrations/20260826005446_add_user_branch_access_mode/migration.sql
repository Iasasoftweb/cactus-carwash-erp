-- AlterTable
ALTER TABLE `users` ADD COLUMN `branch_access_mode` ENUM('ALL', 'ASSIGNED') NOT NULL DEFAULT 'ASSIGNED';
