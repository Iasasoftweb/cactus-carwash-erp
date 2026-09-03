ALTER TABLE `inventory_movements`
  ADD COLUMN `unit_cost` DECIMAL(14, 4) NULL AFTER `new_stock`,
  ADD COLUMN `movement_value` DECIMAL(16, 2) NULL AFTER `unit_cost`;

CREATE INDEX `inventory_movements_company_product_created_idx`
  ON `inventory_movements`(`company_id`, `product_id`, `created_at`);
