-- Categorías empresariales y niveles de precios
-- Conserva categorías, productos, precios, inventario y ventas existentes.

-- 1. Las categorías pasan a ser empresariales.
-- branch_id queda temporalmente como referencia opcional de origen.
ALTER TABLE `product_categories`
  MODIFY `branch_id` CHAR(36) NULL;

UPDATE `product_categories`
SET `branch_id` = NULL;

-- 2. Precio mínimo por producto y sucursal.
ALTER TABLE `product_branches`
  ADD COLUMN `minimum_price` DECIMAL(14, 2) NULL AFTER `price`;

UPDATE `product_branches`
SET `minimum_price` = `price`
WHERE `minimum_price` IS NULL;

-- 3. Niveles de precio configurables por empresa.
CREATE TABLE `price_levels` (
  `id` CHAR(36) NOT NULL,
  `company_id` CHAR(36) NOT NULL,
  `code` VARCHAR(40) NOT NULL,
  `name` VARCHAR(120) NOT NULL,
  `is_default` BOOLEAN NOT NULL DEFAULT false,
  `sort_order` INTEGER NOT NULL DEFAULT 0,
  `active` BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,

  UNIQUE INDEX `price_levels_company_id_code_key` (`company_id`, `code`),
  INDEX `price_levels_company_id_active_sort_order_idx`
    (`company_id`, `active`, `sort_order`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `price_levels`
  ADD CONSTRAINT `price_levels_company_id_fkey`
  FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

-- 4. Nivel DETALLE inicial para cada empresa.
INSERT INTO `price_levels` (
  `id`,
  `company_id`,
  `code`,
  `name`,
  `is_default`,
  `sort_order`,
  `active`,
  `created_at`,
  `updated_at`
)
SELECT
  UUID(),
  company.`id`,
  'RETAIL',
  'Detalle',
  true,
  10,
  true,
  CURRENT_TIMESTAMP(3),
  CURRENT_TIMESTAMP(3)
FROM `companies` company;

-- 5. Nivel comercial asignado al cliente.
ALTER TABLE `customers`
  ADD COLUMN `price_level_id` CHAR(36) NULL AFTER `type`,
  ADD INDEX `customers_company_id_price_level_id_idx`
    (`company_id`, `price_level_id`);

UPDATE `customers` customer
INNER JOIN `price_levels` level
  ON level.`company_id` = customer.`company_id`
 AND level.`code` = 'RETAIL'
SET customer.`price_level_id` = level.`id`;

ALTER TABLE `customers`
  ADD CONSTRAINT `customers_price_level_id_fkey`
  FOREIGN KEY (`price_level_id`) REFERENCES `price_levels`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

-- 6. Precio por nivel, producto y sucursal.
CREATE TABLE `product_branch_prices` (
  `id` CHAR(36) NOT NULL,
  `company_id` CHAR(36) NOT NULL,
  `product_branch_id` CHAR(36) NOT NULL,
  `price_level_id` CHAR(36) NOT NULL,
  `price` DECIMAL(14, 2) NOT NULL,
  `active` BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,

  UNIQUE INDEX `product_branch_prices_product_branch_id_price_level_id_key`
    (`product_branch_id`, `price_level_id`),
  INDEX `product_branch_prices_company_id_active_idx`
    (`company_id`, `active`),
  INDEX `product_branch_prices_price_level_id_active_idx`
    (`price_level_id`, `active`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `product_branch_prices`
  ADD CONSTRAINT `product_branch_prices_company_id_fkey`
  FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `product_branch_prices_product_branch_id_fkey`
  FOREIGN KEY (`product_branch_id`) REFERENCES `product_branches`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `product_branch_prices_price_level_id_fkey`
  FOREIGN KEY (`price_level_id`) REFERENCES `price_levels`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

-- 7. El precio actual se conserva como precio DETALLE.
INSERT INTO `product_branch_prices` (
  `id`,
  `company_id`,
  `product_branch_id`,
  `price_level_id`,
  `price`,
  `active`,
  `created_at`,
  `updated_at`
)
SELECT
  UUID(),
  product_branch.`company_id`,
  product_branch.`id`,
  level.`id`,
  product_branch.`price`,
  product_branch.`active`,
  CURRENT_TIMESTAMP(3),
  CURRENT_TIMESTAMP(3)
FROM `product_branches` product_branch
INNER JOIN `price_levels` level
  ON level.`company_id` = product_branch.`company_id`
 AND level.`code` = 'RETAIL';

