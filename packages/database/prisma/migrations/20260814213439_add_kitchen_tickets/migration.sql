-- CreateTable
CREATE TABLE `kitchen_tickets` (
    `id` CHAR(36) NOT NULL,
    `point_of_sale_id` CHAR(36) NOT NULL,
    `account_id` CHAR(36) NOT NULL,
    `ticket_number` VARCHAR(50) NOT NULL,
    `status` ENUM('PENDING', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `notes` VARCHAR(255) NULL,
    `sent_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `started_at` DATETIME(3) NULL,
    `ready_at` DATETIME(3) NULL,
    `completed_at` DATETIME(3) NULL,
    `cancelled_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `kitchen_tickets_point_of_sale_id_status_sent_at_idx`(`point_of_sale_id`, `status`, `sent_at`),
    INDEX `kitchen_tickets_account_id_sent_at_idx`(`account_id`, `sent_at`),
    UNIQUE INDEX `kitchen_tickets_point_of_sale_id_ticket_number_key`(`point_of_sale_id`, `ticket_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `kitchen_ticket_items` (
    `id` CHAR(36) NOT NULL,
    `ticket_id` CHAR(36) NOT NULL,
    `account_item_id` CHAR(36) NOT NULL,
    `quantity` DECIMAL(12, 3) NOT NULL,
    `status` ENUM('PENDING', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `notes` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `kitchen_ticket_items_account_item_id_idx`(`account_item_id`),
    INDEX `kitchen_ticket_items_ticket_id_status_idx`(`ticket_id`, `status`),
    UNIQUE INDEX `kitchen_ticket_items_ticket_id_account_item_id_key`(`ticket_id`, `account_item_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `kitchen_tickets` ADD CONSTRAINT `kitchen_tickets_point_of_sale_id_fkey` FOREIGN KEY (`point_of_sale_id`) REFERENCES `points_of_sale`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `kitchen_tickets` ADD CONSTRAINT `kitchen_tickets_account_id_fkey` FOREIGN KEY (`account_id`) REFERENCES `pos_accounts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `kitchen_ticket_items` ADD CONSTRAINT `kitchen_ticket_items_ticket_id_fkey` FOREIGN KEY (`ticket_id`) REFERENCES `kitchen_tickets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `kitchen_ticket_items` ADD CONSTRAINT `kitchen_ticket_items_account_item_id_fkey` FOREIGN KEY (`account_item_id`) REFERENCES `pos_account_items`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
