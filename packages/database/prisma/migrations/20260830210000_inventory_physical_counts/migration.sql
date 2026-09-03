CREATE TABLE `inventory_counts` (
  `id` CHAR(36) NOT NULL,
  `company_id` CHAR(36) NOT NULL,
  `branch_id` CHAR(36) NOT NULL,
  `reference` VARCHAR(50) NOT NULL,
  `status` ENUM('DRAFT', 'CONFIRMED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
  `notes` VARCHAR(255) NULL,
  `created_by` VARCHAR(160) NOT NULL,
  `confirmed_by` VARCHAR(160) NULL,
  `confirmed_at` DATETIME(3) NULL,
  `cancelled_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  UNIQUE INDEX `inventory_counts_company_id_reference_key` (`company_id`, `reference`),
  INDEX `inventory_counts_company_branch_status_created_idx` (`company_id`, `branch_id`, `status`, `created_at`),
  PRIMARY KEY (`id`),
  CONSTRAINT `inventory_counts_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `inventory_counts_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `inventory_count_items` (
  `id` CHAR(36) NOT NULL,
  `inventory_count_id` CHAR(36) NOT NULL,
  `product_branch_id` CHAR(36) NOT NULL,
  `expected_quantity` DECIMAL(14, 3) NOT NULL,
  `counted_quantity` DECIMAL(14, 3) NULL,
  `difference_quantity` DECIMAL(14, 3) NULL,
  `unit_cost` DECIMAL(14, 4) NULL,
  `difference_value` DECIMAL(16, 2) NULL,
  `note` VARCHAR(255) NULL,
  `updated_at` DATETIME(3) NOT NULL,
  UNIQUE INDEX `inventory_count_items_count_product_key` (`inventory_count_id`, `product_branch_id`),
  INDEX `inventory_count_items_product_branch_id_idx` (`product_branch_id`),
  PRIMARY KEY (`id`),
  CONSTRAINT `inventory_count_items_inventory_count_id_fkey` FOREIGN KEY (`inventory_count_id`) REFERENCES `inventory_counts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `inventory_count_items_product_branch_id_fkey` FOREIGN KEY (`product_branch_id`) REFERENCES `product_branches`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
