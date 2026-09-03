-- AlterTable
ALTER TABLE `products` ADD COLUMN `preparation_station_id` CHAR(36) NULL;

-- CreateTable
CREATE TABLE `preparation_stations` (
    `id` CHAR(36) NOT NULL,
    `point_of_sale_id` CHAR(36) NOT NULL,
    `code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `preparation_stations_point_of_sale_id_active_sort_order_idx`(`point_of_sale_id`, `active`, `sort_order`),
    UNIQUE INDEX `preparation_stations_point_of_sale_id_code_key`(`point_of_sale_id`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `products_preparation_station_id_active_idx` ON `products`(`preparation_station_id`, `active`);

-- AddForeignKey
ALTER TABLE `preparation_stations` ADD CONSTRAINT `preparation_stations_point_of_sale_id_fkey` FOREIGN KEY (`point_of_sale_id`) REFERENCES `points_of_sale`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_preparation_station_id_fkey` FOREIGN KEY (`preparation_station_id`) REFERENCES `preparation_stations`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
