-- AlterTable
ALTER TABLE `products` ADD COLUMN `sale_unit` ENUM('UNIT', 'WEIGHT', 'VOLUME', 'SERVICE') NOT NULL DEFAULT 'UNIT';

-- CreateTable
CREATE TABLE `branch_modules` (
    `id` CHAR(36) NOT NULL,
    `company_id` CHAR(36) NOT NULL,
    `branch_id` CHAR(36) NOT NULL,
    `module` ENUM('POS', 'CAR_WASH') NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `branch_modules_company_id_branch_id_enabled_idx`(`company_id`, `branch_id`, `enabled`),
    UNIQUE INDEX `branch_modules_branch_id_module_key`(`branch_id`, `module`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pos_capabilities` (
    `id` CHAR(36) NOT NULL,
    `point_of_sale_id` CHAR(36) NOT NULL,
    `capability` ENUM('RETAIL', 'FOOD_SERVICE', 'WEIGHTED_PRODUCTS', 'HOLD_ORDERS', 'TABLES', 'KITCHEN_TICKETS', 'DELIVERY') NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `pos_capabilities_point_of_sale_id_enabled_idx`(`point_of_sale_id`, `enabled`),
    UNIQUE INDEX `pos_capabilities_point_of_sale_id_capability_key`(`point_of_sale_id`, `capability`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `company_modules` (
    `id` CHAR(36) NOT NULL,
    `company_id` CHAR(36) NOT NULL,
    `module` ENUM('POS', 'CAR_WASH') NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `company_modules_company_id_enabled_idx`(`company_id`, `enabled`),
    UNIQUE INDEX `company_modules_company_id_module_key`(`company_id`, `module`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `branch_modules` ADD CONSTRAINT `branch_modules_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `branch_modules` ADD CONSTRAINT `branch_modules_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pos_capabilities` ADD CONSTRAINT `pos_capabilities_point_of_sale_id_fkey` FOREIGN KEY (`point_of_sale_id`) REFERENCES `points_of_sale`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `company_modules` ADD CONSTRAINT `company_modules_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
