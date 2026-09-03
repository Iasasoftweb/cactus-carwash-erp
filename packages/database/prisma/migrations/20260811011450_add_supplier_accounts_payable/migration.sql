-- CreateTable
CREATE TABLE `supplier_invoices` (
    `id` CHAR(36) NOT NULL,
    `company_id` CHAR(36) NOT NULL,
    `branch_id` CHAR(36) NOT NULL,
    `supplier_id` CHAR(36) NOT NULL,
    `purchase_order_id` CHAR(36) NULL,
    `invoice_number` VARCHAR(80) NOT NULL,
    `status` ENUM('PENDING', 'PARTIALLY_PAID', 'PAID', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `subtotal` DECIMAL(14, 2) NOT NULL,
    `tax_amount` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `total` DECIMAL(14, 2) NOT NULL,
    `balance` DECIMAL(14, 2) NOT NULL,
    `issued_at` DATETIME(3) NOT NULL,
    `due_date` DATETIME(3) NULL,
    `notes` VARCHAR(255) NULL,
    `created_by` VARCHAR(160) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `pointOfSaleId` CHAR(36) NULL,

    INDEX `supplier_invoices_company_id_branch_id_status_idx`(`company_id`, `branch_id`, `status`),
    INDEX `supplier_invoices_supplier_id_status_due_date_idx`(`supplier_id`, `status`, `due_date`),
    INDEX `supplier_invoices_purchase_order_id_idx`(`purchase_order_id`),
    UNIQUE INDEX `supplier_invoices_supplier_id_invoice_number_key`(`supplier_id`, `invoice_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `supplier_payments` (
    `id` CHAR(36) NOT NULL,
    `company_id` CHAR(36) NOT NULL,
    `branch_id` CHAR(36) NOT NULL,
    `supplier_id` CHAR(36) NOT NULL,
    `payment_method_id` CHAR(36) NOT NULL,
    `status` ENUM('ISSUED', 'CANCELLED') NOT NULL DEFAULT 'ISSUED',
    `reference` VARCHAR(120) NULL,
    `description` VARCHAR(255) NULL,
    `amount` DECIMAL(14, 2) NOT NULL,
    `paid_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_by` VARCHAR(160) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `pointOfSaleId` CHAR(36) NULL,

    INDEX `supplier_payments_company_id_branch_id_paid_at_idx`(`company_id`, `branch_id`, `paid_at`),
    INDEX `supplier_payments_supplier_id_paid_at_idx`(`supplier_id`, `paid_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `supplier_payment_allocations` (
    `supplier_payment_id` CHAR(36) NOT NULL,
    `supplier_invoice_id` CHAR(36) NOT NULL,
    `amount` DECIMAL(14, 2) NOT NULL,

    INDEX `supplier_payment_allocations_supplier_invoice_id_idx`(`supplier_invoice_id`),
    PRIMARY KEY (`supplier_payment_id`, `supplier_invoice_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `supplier_invoices` ADD CONSTRAINT `supplier_invoices_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supplier_invoices` ADD CONSTRAINT `supplier_invoices_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supplier_invoices` ADD CONSTRAINT `supplier_invoices_supplier_id_fkey` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supplier_invoices` ADD CONSTRAINT `supplier_invoices_purchase_order_id_fkey` FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_orders`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supplier_invoices` ADD CONSTRAINT `supplier_invoices_pointOfSaleId_fkey` FOREIGN KEY (`pointOfSaleId`) REFERENCES `points_of_sale`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supplier_payments` ADD CONSTRAINT `supplier_payments_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supplier_payments` ADD CONSTRAINT `supplier_payments_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supplier_payments` ADD CONSTRAINT `supplier_payments_supplier_id_fkey` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supplier_payments` ADD CONSTRAINT `supplier_payments_payment_method_id_fkey` FOREIGN KEY (`payment_method_id`) REFERENCES `payment_methods`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supplier_payments` ADD CONSTRAINT `supplier_payments_pointOfSaleId_fkey` FOREIGN KEY (`pointOfSaleId`) REFERENCES `points_of_sale`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supplier_payment_allocations` ADD CONSTRAINT `supplier_payment_allocations_supplier_payment_id_fkey` FOREIGN KEY (`supplier_payment_id`) REFERENCES `supplier_payments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supplier_payment_allocations` ADD CONSTRAINT `supplier_payment_allocations_supplier_invoice_id_fkey` FOREIGN KEY (`supplier_invoice_id`) REFERENCES `supplier_invoices`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
