-- CreateTable
CREATE TABLE `pos_profitability_policies` (
    `id` CHAR(36) NOT NULL,
    `point_of_sale_id` CHAR(36) NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `minimum_gross_margin_percent` DECIMAL(7, 2) NOT NULL DEFAULT 20,
    `minimum_cost_coverage_percent` DECIMAL(7, 2) NOT NULL DEFAULT 95,
    `alert_low_margin_enabled` BOOLEAN NOT NULL DEFAULT true,
    `alert_incomplete_cost_enabled` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `pos_profitability_policies_point_of_sale_id_key`(`point_of_sale_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `pos_profitability_policies` ADD CONSTRAINT `pos_profitability_policies_point_of_sale_id_fkey` FOREIGN KEY (`point_of_sale_id`) REFERENCES `points_of_sale`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
