CREATE TABLE `product_branches` (
  `id` CHAR(36) NOT NULL,
  `company_id` CHAR(36) NOT NULL,
  `branch_id` CHAR(36) NOT NULL,
  `product_id` CHAR(36) NOT NULL,
  `category_id` CHAR(36) NOT NULL,
  `price` DECIMAL(14, 2) NOT NULL,
  `unit_cost` DECIMAL(14, 4) NULL,
  `stock_quantity` DECIMAL(14, 3) NOT NULL DEFAULT 0,
  `minimum_stock` DECIMAL(14, 3) NOT NULL DEFAULT 0,
  `track_inventory` BOOLEAN NOT NULL DEFAULT TRUE,
  `active` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `product_branches_product_id_branch_id_key` (`product_id`, `branch_id`),
  INDEX `product_branches_company_id_branch_id_active_idx` (`company_id`, `branch_id`, `active`),
  INDEX `product_branches_category_id_active_idx` (`category_id`, `active`),
  CONSTRAINT `product_branches_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `product_branches_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `product_branches_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `product_branches_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `product_categories` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `product_points_of_sale` (
  `id` CHAR(36) NOT NULL,
  `product_branch_id` CHAR(36) NOT NULL,
  `point_of_sale_id` CHAR(36) NOT NULL,
  `preparation_station_id` CHAR(36) NULL,
  `active` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `product_points_of_sale_product_branch_id_point_of_sale_id_key` (`product_branch_id`, `point_of_sale_id`),
  INDEX `product_points_of_sale_point_of_sale_id_active_idx` (`point_of_sale_id`, `active`),
  INDEX `product_points_of_sale_preparation_station_id_active_idx` (`preparation_station_id`, `active`),
  CONSTRAINT `product_points_of_sale_product_branch_id_fkey` FOREIGN KEY (`product_branch_id`) REFERENCES `product_branches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `product_points_of_sale_point_of_sale_id_fkey` FOREIGN KEY (`point_of_sale_id`) REFERENCES `points_of_sale` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `product_points_of_sale_preparation_station_id_fkey` FOREIGN KEY (`preparation_station_id`) REFERENCES `preparation_stations` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `product_branches` (
  `id`, `company_id`, `branch_id`, `product_id`, `category_id`, `price`,
  `unit_cost`, `stock_quantity`, `minimum_stock`, `track_inventory`, `active`,
  `created_at`, `updated_at`
)
SELECT
  UUID(), p.`company_id`, p.`branch_id`, p.`id`, p.`category_id`, p.`price`,
  p.`unit_cost`, p.`stock_quantity`, p.`minimum_stock`, p.`track_inventory`,
  p.`active`, p.`created_at`, p.`updated_at`
FROM `products` p;

INSERT INTO `product_points_of_sale` (
  `id`, `product_branch_id`, `point_of_sale_id`, `preparation_station_id`,
  `active`, `created_at`, `updated_at`
)
SELECT
  UUID(), pb.`id`, p.`point_of_sale_id`, p.`preparation_station_id`,
  p.`active`, p.`created_at`, p.`updated_at`
FROM `products` p
INNER JOIN `product_branches` pb
  ON pb.`product_id` = p.`id`
 AND pb.`branch_id` = p.`branch_id`;
