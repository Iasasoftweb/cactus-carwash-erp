-- AlterTable
ALTER TABLE `pos_account_items` ADD COLUMN `cost_total` DECIMAL(14, 2) NULL,
    ADD COLUMN `unit_cost` DECIMAL(14, 4) NULL;

-- AlterTable
ALTER TABLE `pos_movement_items` ADD COLUMN `cost_total` DECIMAL(14, 2) NULL,
    ADD COLUMN `unit_cost` DECIMAL(14, 4) NULL;

-- AlterTable
ALTER TABLE `products` ADD COLUMN `unit_cost` DECIMAL(14, 4) NULL;
