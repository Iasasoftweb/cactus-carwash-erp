-- AlterTable
ALTER TABLE `cash_movements` MODIFY `type` ENUM('OPENING', 'SALE', 'COLLECTION', 'CREDIT_SALE', 'EXPENSE', 'WITHDRAWAL', 'DEPOSIT', 'ADJUSTMENT', 'CLOSING') NOT NULL;

-- CreateTable
CREATE TABLE `credit_authorizations` (
    `id` CHAR(36) NOT NULL,
    `order_id` CHAR(36) NOT NULL,
    `customer_id` CHAR(36) NOT NULL,
    `authorized_by_id` CHAR(36) NULL,
    `amount` DECIMAL(14, 2) NOT NULL,
    `credit_days` INTEGER NOT NULL,
    `due_date` DATETIME(3) NULL,
    `status` ENUM('APPROVED', 'CANCELLED') NOT NULL DEFAULT 'APPROVED',
    `authorized_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `cancelled_at` DATETIME(3) NULL,
    `notes` VARCHAR(255) NULL,

    UNIQUE INDEX `credit_authorizations_order_id_key`(`order_id`),
    INDEX `credit_authorizations_customer_id_status_authorized_at_idx`(`customer_id`, `status`, `authorized_at`),
    INDEX `credit_authorizations_authorized_by_id_authorized_at_idx`(`authorized_by_id`, `authorized_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `credit_authorizations` ADD CONSTRAINT `credit_authorizations_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `service_orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `credit_authorizations` ADD CONSTRAINT `credit_authorizations_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `credit_authorizations` ADD CONSTRAINT `credit_authorizations_authorized_by_id_fkey` FOREIGN KEY (`authorized_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
