-- AlterTable
ALTER TABLE `cash_registers` ADD COLUMN `point_of_sale_id` CHAR(36) NULL;

-- CreateTable
CREATE TABLE `pos_accounts` (
    `id` CHAR(36) NOT NULL,
    `point_of_sale_id` CHAR(36) NOT NULL,
    `cash_register_id` CHAR(36) NULL,
    `order_id` CHAR(36) NULL,
    `reference` VARCHAR(50) NOT NULL,
    `customer_alias` VARCHAR(160) NOT NULL,
    `table_reference` VARCHAR(50) NULL,
    `status` ENUM('OPEN', 'READY_TO_PAY', 'PAID', 'CANCELLED') NOT NULL DEFAULT 'OPEN',
    `subtotal` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `tax_amount` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `total` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `opened_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `ready_to_pay_at` DATETIME(3) NULL,
    `closed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `pos_accounts_reference_key`(`reference`),
    INDEX `pos_accounts_point_of_sale_id_status_opened_at_idx`(`point_of_sale_id`, `status`, `opened_at`),
    INDEX `pos_accounts_order_id_status_idx`(`order_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pos_account_items` (
    `id` CHAR(36) NOT NULL,
    `account_id` CHAR(36) NOT NULL,
    `product_id` CHAR(36) NOT NULL,
    `quantity` DECIMAL(12, 3) NOT NULL,
    `unit_price` DECIMAL(14, 2) NOT NULL,
    `tax_amount` DECIMAL(14, 2) NOT NULL,
    `line_total` DECIMAL(14, 2) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `pos_account_items_account_id_created_at_idx`(`account_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `cash_registers_point_of_sale_id_active_idx` ON `cash_registers`(`point_of_sale_id`, `active`);

-- AddForeignKey
ALTER TABLE `cash_registers` ADD CONSTRAINT `cash_registers_point_of_sale_id_fkey` FOREIGN KEY (`point_of_sale_id`) REFERENCES `points_of_sale`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pos_accounts` ADD CONSTRAINT `pos_accounts_point_of_sale_id_fkey` FOREIGN KEY (`point_of_sale_id`) REFERENCES `points_of_sale`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pos_accounts` ADD CONSTRAINT `pos_accounts_cash_register_id_fkey` FOREIGN KEY (`cash_register_id`) REFERENCES `cash_registers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pos_accounts` ADD CONSTRAINT `pos_accounts_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `service_orders`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pos_account_items` ADD CONSTRAINT `pos_account_items_account_id_fkey` FOREIGN KEY (`account_id`) REFERENCES `pos_accounts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pos_account_items` ADD CONSTRAINT `pos_account_items_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
