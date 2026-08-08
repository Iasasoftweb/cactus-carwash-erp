-- CreateTable
CREATE TABLE `order_events` (
    `id` CHAR(36) NOT NULL,
    `order_id` CHAR(36) NOT NULL,
    `type` ENUM('ORDER_CREATED', 'STATUS_CHANGED', 'NOTE_ADDED', 'CHECKLIST_UPDATED', 'SERVICE_ADDED', 'EMPLOYEE_CHANGED', 'PHOTO_ADDED') NOT NULL,
    `title` VARCHAR(160) NOT NULL,
    `description` TEXT NULL,
    `metadata` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `order_events_order_id_created_at_idx`(`order_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `order_checklist_items` (
    `id` CHAR(36) NOT NULL,
    `order_id` CHAR(36) NOT NULL,
    `code` VARCHAR(80) NOT NULL,
    `label` VARCHAR(160) NOT NULL,
    `checked` BOOLEAN NOT NULL DEFAULT false,
    `notes` VARCHAR(255) NULL,
    `updated_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `order_checklist_items_order_id_checked_idx`(`order_id`, `checked`),
    UNIQUE INDEX `order_checklist_items_order_id_code_key`(`order_id`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `order_notes` (
    `id` CHAR(36) NOT NULL,
    `order_id` CHAR(36) NOT NULL,
    `visibility` ENUM('INTERNAL', 'CUSTOMER') NOT NULL,
    `content` TEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `order_notes_order_id_visibility_created_at_idx`(`order_id`, `visibility`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `order_events` ADD CONSTRAINT `order_events_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `service_orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_checklist_items` ADD CONSTRAINT `order_checklist_items_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `service_orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_notes` ADD CONSTRAINT `order_notes_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `service_orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
