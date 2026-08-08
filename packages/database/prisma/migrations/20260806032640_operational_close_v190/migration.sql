-- AlterTable
ALTER TABLE `payments` ADD COLUMN `description` VARCHAR(255) NULL,
    ADD COLUMN `source_id` CHAR(36) NULL,
    ADD COLUMN `source_type` VARCHAR(50) NULL;

-- AlterTable
ALTER TABLE `products` ADD COLUMN `image_url` VARCHAR(500) NULL;

-- CreateTable
CREATE TABLE `expense_categories` (
    `id` CHAR(36) NOT NULL,
    `company_id` CHAR(36) NOT NULL,
    `code` VARCHAR(40) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `expense_categories_company_id_code_key`(`company_id`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `expenses` (
    `id` CHAR(36) NOT NULL,
    `company_id` CHAR(36) NOT NULL,
    `branch_id` CHAR(36) NOT NULL,
    `category_id` CHAR(36) NOT NULL,
    `cash_register_id` CHAR(36) NOT NULL,
    `cash_session_id` CHAR(36) NULL,
    `requested_by_id` CHAR(36) NOT NULL,
    `beneficiary` VARCHAR(160) NOT NULL,
    `concept` VARCHAR(255) NOT NULL,
    `amount` DECIMAL(14, 2) NOT NULL,
    `reference` VARCHAR(120) NULL,
    `status` ENUM('PENDING', 'APPROVED', 'ISSUED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `approved_at` DATETIME(3) NULL,
    `issued_at` DATETIME(3) NULL,
    `cancelled_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `expenses_branch_id_status_created_at_idx`(`branch_id`, `status`, `created_at`),
    INDEX `expenses_cash_register_id_status_idx`(`cash_register_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cash_print_logs` (
    `id` CHAR(36) NOT NULL,
    `cash_session_id` CHAR(36) NOT NULL,
    `document_type` VARCHAR(40) NOT NULL,
    `reprint` BOOLEAN NOT NULL DEFAULT false,
    `printed_by` VARCHAR(160) NOT NULL,
    `printed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `cash_print_logs_cash_session_id_document_type_printed_at_idx`(`cash_session_id`, `document_type`, `printed_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `payments_source_type_source_id_idx` ON `payments`(`source_type`, `source_id`);

-- AddForeignKey
ALTER TABLE `expense_categories` ADD CONSTRAINT `expense_categories_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `expense_categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_cash_register_id_fkey` FOREIGN KEY (`cash_register_id`) REFERENCES `cash_registers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_cash_session_id_fkey` FOREIGN KEY (`cash_session_id`) REFERENCES `cash_sessions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_requested_by_id_fkey` FOREIGN KEY (`requested_by_id`) REFERENCES `employees`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cash_print_logs` ADD CONSTRAINT `cash_print_logs_cash_session_id_fkey` FOREIGN KEY (`cash_session_id`) REFERENCES `cash_sessions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
