-- CreateTable
CREATE TABLE `customer_collection_activities` (
    `id` CHAR(36) NOT NULL,
    `company_id` CHAR(36) NOT NULL,
    `customer_id` CHAR(36) NOT NULL,
    `created_by_id` CHAR(36) NULL,
    `contact_type` ENUM('PHONE', 'WHATSAPP', 'EMAIL', 'SMS', 'IN_PERSON', 'OTHER') NOT NULL,
    `result` ENUM('CONTACTED', 'NO_ANSWER', 'PROMISE_TO_PAY', 'PAYMENT_REPORTED', 'DISPUTED', 'FOLLOW_UP_REQUIRED', 'OTHER') NOT NULL,
    `notes` TEXT NOT NULL,
    `next_follow_up_at` DATETIME(3) NULL,
    `promised_payment_date` DATETIME(3) NULL,
    `promised_amount` DECIMAL(14, 2) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `customer_collection_activities_company_id_created_at_idx`(`company_id`, `created_at`),
    INDEX `customer_collection_activities_customer_id_created_at_idx`(`customer_id`, `created_at`),
    INDEX `customer_collection_activities_company_id_next_follow_up_at_idx`(`company_id`, `next_follow_up_at`),
    INDEX `customer_collection_activities_company_id_promised_payment_d_idx`(`company_id`, `promised_payment_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `customer_collection_activities` ADD CONSTRAINT `customer_collection_activities_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customer_collection_activities` ADD CONSTRAINT `customer_collection_activities_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customer_collection_activities` ADD CONSTRAINT `customer_collection_activities_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
