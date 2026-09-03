-- Cliente y nivel de precio aplicado en POS.
-- Conserva todas las cuentas, movimientos e ítems existentes.

ALTER TABLE `pos_accounts`
  ADD COLUMN `customer_id` CHAR(36) NULL AFTER `order_id`,
  ADD COLUMN `price_level_id` CHAR(36) NULL AFTER `customer_id`,
  ADD COLUMN `price_level_code` VARCHAR(40) NULL AFTER `price_level_id`,
  ADD COLUMN `price_level_name` VARCHAR(120) NULL AFTER `price_level_code`,
  ADD INDEX `pos_accounts_customer_id_status_idx` (`customer_id`, `status`),
  ADD INDEX `pos_accounts_price_level_id_idx` (`price_level_id`);

ALTER TABLE `pos_accounts`
  ADD CONSTRAINT `pos_accounts_customer_id_fkey`
  FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `pos_accounts_price_level_id_fkey`
  FOREIGN KEY (`price_level_id`) REFERENCES `price_levels`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `pos_movements`
  ADD COLUMN `customer_id` CHAR(36) NULL AFTER `order_id`,
  ADD COLUMN `price_level_id` CHAR(36) NULL AFTER `customer_id`,
  ADD COLUMN `price_level_code` VARCHAR(40) NULL AFTER `price_level_id`,
  ADD COLUMN `price_level_name` VARCHAR(120) NULL AFTER `price_level_code`,
  ADD INDEX `pos_movements_customer_id_created_at_idx`
    (`customer_id`, `created_at`),
  ADD INDEX `pos_movements_price_level_id_idx` (`price_level_id`);

ALTER TABLE `pos_movements`
  ADD CONSTRAINT `pos_movements_customer_id_fkey`
  FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `pos_movements_price_level_id_fkey`
  FOREIGN KEY (`price_level_id`) REFERENCES `price_levels`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `pos_account_items`
  ADD COLUMN `standard_unit_price` DECIMAL(14, 2) NOT NULL DEFAULT 0
    AFTER `unit_price`,
  ADD COLUMN `price_level_code` VARCHAR(40) NULL
    AFTER `standard_unit_price`,
  ADD COLUMN `price_level_name` VARCHAR(120) NULL
    AFTER `price_level_code`,
  ADD COLUMN `manual_price_override` BOOLEAN NOT NULL DEFAULT false
    AFTER `price_level_name`,
  ADD COLUMN `price_override_reason` VARCHAR(255) NULL
    AFTER `manual_price_override`;

UPDATE `pos_account_items`
SET `standard_unit_price` = `unit_price`
WHERE `standard_unit_price` = 0;

ALTER TABLE `pos_movement_items`
  ADD COLUMN `standard_unit_price` DECIMAL(14, 2) NOT NULL DEFAULT 0
    AFTER `unit_price`,
  ADD COLUMN `price_level_code` VARCHAR(40) NULL
    AFTER `standard_unit_price`,
  ADD COLUMN `price_level_name` VARCHAR(120) NULL
    AFTER `price_level_code`,
  ADD COLUMN `manual_price_override` BOOLEAN NOT NULL DEFAULT false
    AFTER `price_level_name`,
  ADD COLUMN `price_override_reason` VARCHAR(255) NULL
    AFTER `manual_price_override`;

UPDATE `pos_movement_items`
SET `standard_unit_price` = `unit_price`
WHERE `standard_unit_price` = 0;

