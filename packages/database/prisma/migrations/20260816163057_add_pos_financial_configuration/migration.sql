-- AlterTable
ALTER TABLE `pos_account_items` ADD COLUMN `tax_rate` DECIMAL(7, 4) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `pos_accounts` ADD COLUMN `sale_mode` ENUM('DINE_IN', 'TAKEAWAY', 'DIRECT') NOT NULL DEFAULT 'DIRECT',
    ADD COLUMN `service_charge_amount` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    ADD COLUMN `service_charge_rate` DECIMAL(7, 4) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `pos_movement_items` ADD COLUMN `tax_rate` DECIMAL(7, 4) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `pos_movements` ADD COLUMN `sale_mode` ENUM('DINE_IN', 'TAKEAWAY', 'DIRECT') NOT NULL DEFAULT 'DIRECT',
    ADD COLUMN `service_charge_amount` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    ADD COLUMN `service_charge_rate` DECIMAL(7, 4) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE `pos_financial_configurations` (
    `id` CHAR(36) NOT NULL,
    `point_of_sale_id` CHAR(36) NOT NULL,
    `taxes_enabled` BOOLEAN NOT NULL DEFAULT false,
    `service_charge_enabled` BOOLEAN NOT NULL DEFAULT false,
    `service_charge_rate` DECIMAL(7, 4) NOT NULL DEFAULT 0,
    `service_charge_dine_in` BOOLEAN NOT NULL DEFAULT true,
    `service_charge_takeaway` BOOLEAN NOT NULL DEFAULT false,
    `service_charge_direct` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `pos_financial_configurations_point_of_sale_id_key`(`point_of_sale_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `pos_financial_configurations` ADD CONSTRAINT `pos_financial_configurations_point_of_sale_id_fkey` FOREIGN KEY (`point_of_sale_id`) REFERENCES `points_of_sale`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
