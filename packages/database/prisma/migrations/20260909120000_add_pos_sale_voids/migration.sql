CREATE TABLE `pos_sale_voids` (
  `id` CHAR(36) NOT NULL,
  `company_id` CHAR(36) NOT NULL,
  `branch_id` CHAR(36) NOT NULL,
  `point_of_sale_id` CHAR(36) NOT NULL,
  `source_type` VARCHAR(30) NOT NULL,
  `source_id` CHAR(36) NOT NULL,
  `reference` VARCHAR(50) NOT NULL,
  `reason` VARCHAR(255) NOT NULL,
  `total` DECIMAL(14, 2) NOT NULL,
  `voided_by_user_id` CHAR(36) NOT NULL,
  `voided_by_username` VARCHAR(160) NOT NULL,
  `voided_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`),
  UNIQUE INDEX `pos_sale_voids_source_type_source_id_key`
    (`source_type`, `source_id`),
  INDEX `pos_sale_voids_company_id_branch_id_voided_at_idx`
    (`company_id`, `branch_id`, `voided_at`),
  INDEX `pos_sale_voids_point_of_sale_id_voided_at_idx`
    (`point_of_sale_id`, `voided_at`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
