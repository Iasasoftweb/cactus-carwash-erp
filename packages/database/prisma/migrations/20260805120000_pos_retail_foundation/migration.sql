-- AlterTable
ALTER TABLE `service_order_items` ADD COLUMN `point_of_sale_id` CHAR(36) NULL,
    ADD COLUMN `product_id` CHAR(36) NULL;

-- CreateTable
CREATE TABLE `points_of_sale` (
    `id` CHAR(36) NOT NULL,
    `company_id` CHAR(36) NOT NULL,
    `branch_id` CHAR(36) NOT NULL,
    `code` VARCHAR(30) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `description` VARCHAR(255) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `points_of_sale_company_id_active_idx`(`company_id`, `active`),
    UNIQUE INDEX `points_of_sale_branch_id_code_key`(`branch_id`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_categories` (
    `id` CHAR(36) NOT NULL,
    `company_id` CHAR(36) NOT NULL,
    `branch_id` CHAR(36) NOT NULL,
    `code` VARCHAR(40) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `product_categories_branch_id_active_idx`(`branch_id`, `active`),
    UNIQUE INDEX `product_categories_company_id_code_key`(`company_id`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `products` (
    `id` CHAR(36) NOT NULL,
    `company_id` CHAR(36) NOT NULL,
    `branch_id` CHAR(36) NOT NULL,
    `point_of_sale_id` CHAR(36) NOT NULL,
    `category_id` CHAR(36) NOT NULL,
    `sku` VARCHAR(50) NOT NULL,
    `name` VARCHAR(160) NOT NULL,
    `description` VARCHAR(255) NULL,
    `type` ENUM('PRODUCT', 'LUBRICANT', 'PART', 'ACCESSORY', 'SUPPLY', 'FOOD', 'BEVERAGE', 'GIFT') NOT NULL,
    `price` DECIMAL(14, 2) NOT NULL,
    `tax_rate` DECIMAL(7, 4) NOT NULL DEFAULT 0,
    `stock_quantity` DECIMAL(14, 3) NOT NULL DEFAULT 0,
    `track_inventory` BOOLEAN NOT NULL DEFAULT true,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `products_branch_id_point_of_sale_id_active_idx`(`branch_id`, `point_of_sale_id`, `active`),
    INDEX `products_category_id_active_idx`(`category_id`, `active`),
    UNIQUE INDEX `products_company_id_sku_key`(`company_id`, `sku`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pos_movements` (
    `id` CHAR(36) NOT NULL,
    `point_of_sale_id` CHAR(36) NOT NULL,
    `order_id` CHAR(36) NULL,
    `type` ENUM('ORDER_ASSOCIATED', 'DIRECT_SALE') NOT NULL,
    `reference` VARCHAR(50) NOT NULL,
    `customer_alias` VARCHAR(160) NULL,
    `subtotal` DECIMAL(14, 2) NOT NULL,
    `tax_amount` DECIMAL(14, 2) NOT NULL,
    `total` DECIMAL(14, 2) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `pos_movements_point_of_sale_id_created_at_idx`(`point_of_sale_id`, `created_at`),
    INDEX `pos_movements_order_id_created_at_idx`(`order_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pos_movement_items` (
    `id` CHAR(36) NOT NULL,
    `movement_id` CHAR(36) NOT NULL,
    `product_id` CHAR(36) NOT NULL,
    `quantity` DECIMAL(12, 3) NOT NULL,
    `unit_price` DECIMAL(14, 2) NOT NULL,
    `tax_amount` DECIMAL(14, 2) NOT NULL,
    `line_total` DECIMAL(14, 2) NOT NULL,

    INDEX `pos_movement_items_movement_id_idx`(`movement_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `service_order_items` ADD CONSTRAINT `service_order_items_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `service_order_items` ADD CONSTRAINT `service_order_items_point_of_sale_id_fkey` FOREIGN KEY (`point_of_sale_id`) REFERENCES `points_of_sale`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `points_of_sale` ADD CONSTRAINT `points_of_sale_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `points_of_sale` ADD CONSTRAINT `points_of_sale_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_categories` ADD CONSTRAINT `product_categories_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_categories` ADD CONSTRAINT `product_categories_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_point_of_sale_id_fkey` FOREIGN KEY (`point_of_sale_id`) REFERENCES `points_of_sale`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `product_categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pos_movements` ADD CONSTRAINT `pos_movements_point_of_sale_id_fkey` FOREIGN KEY (`point_of_sale_id`) REFERENCES `points_of_sale`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pos_movements` ADD CONSTRAINT `pos_movements_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `service_orders`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pos_movement_items` ADD CONSTRAINT `pos_movement_items_movement_id_fkey` FOREIGN KEY (`movement_id`) REFERENCES `pos_movements`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pos_movement_items` ADD CONSTRAINT `pos_movement_items_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
