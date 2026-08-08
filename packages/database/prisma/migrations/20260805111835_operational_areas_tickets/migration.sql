-- AlterTable
ALTER TABLE `cash_registers` ADD COLUMN `operational_area_id` CHAR(36) NULL;

-- AlterTable
ALTER TABLE `service_categories` ADD COLUMN `operational_area_id` CHAR(36) NULL;

-- CreateTable
CREATE TABLE `operational_areas` (
    `id` CHAR(36) NOT NULL,
    `company_id` CHAR(36) NOT NULL,
    `branch_id` CHAR(36) NOT NULL,
    `code` VARCHAR(20) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `ticket_prefix` VARCHAR(10) NOT NULL,
    `color` VARCHAR(20) NULL,
    `icon` VARCHAR(50) NULL,
    `printer_name` VARCHAR(160) NULL,
    `print_copies` INTEGER NOT NULL DEFAULT 1,
    `auto_print` BOOLEAN NOT NULL DEFAULT true,
    `sla_minutes` INTEGER NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `operational_areas_company_id_active_idx`(`company_id`, `active`),
    UNIQUE INDEX `operational_areas_branch_id_code_key`(`branch_id`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ticket_print_logs` (
    `id` CHAR(36) NOT NULL,
    `order_id` CHAR(36) NOT NULL,
    `operational_area_id` CHAR(36) NOT NULL,
    `ticket_code` VARCHAR(60) NOT NULL,
    `print_type` ENUM('ORIGINAL', 'REPRINT', 'ADDITIONAL') NOT NULL,
    `copy_number` INTEGER NOT NULL DEFAULT 1,
    `printed_by` VARCHAR(160) NULL,
    `printed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ticket_print_logs_order_id_operational_area_id_printed_at_idx`(`order_id`, `operational_area_id`, `printed_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `service_categories_operational_area_id_active_idx` ON `service_categories`(`operational_area_id`, `active`);

-- AddForeignKey
ALTER TABLE `service_categories` ADD CONSTRAINT `service_categories_operational_area_id_fkey` FOREIGN KEY (`operational_area_id`) REFERENCES `operational_areas`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `operational_areas` ADD CONSTRAINT `operational_areas_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `operational_areas` ADD CONSTRAINT `operational_areas_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ticket_print_logs` ADD CONSTRAINT `ticket_print_logs_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `service_orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ticket_print_logs` ADD CONSTRAINT `ticket_print_logs_operational_area_id_fkey` FOREIGN KEY (`operational_area_id`) REFERENCES `operational_areas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
