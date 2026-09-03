-- CreateTable
CREATE TABLE `credit_notes` (
    `id` CHAR(36) NOT NULL,
    `company_id` CHAR(36) NOT NULL,
    `invoice_id` CHAR(36) NOT NULL,
    `issued_by_id` CHAR(36) NULL,
    `credit_note_no` VARCHAR(30) NOT NULL,
    `status` ENUM('ISSUED', 'CANCELLED') NOT NULL DEFAULT 'ISSUED',
    `amount` DECIMAL(14, 2) NOT NULL,
    `reason` VARCHAR(255) NOT NULL,
    `issued_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `cancelled_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `credit_notes_invoice_id_status_idx`(`invoice_id`, `status`),
    INDEX `credit_notes_company_id_issued_at_idx`(`company_id`, `issued_at`),
    UNIQUE INDEX `credit_notes_company_id_credit_note_no_key`(`company_id`, `credit_note_no`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `credit_notes` ADD CONSTRAINT `credit_notes_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `credit_notes` ADD CONSTRAINT `credit_notes_invoice_id_fkey` FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `credit_notes` ADD CONSTRAINT `credit_notes_issued_by_id_fkey` FOREIGN KEY (`issued_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
