ALTER TABLE `companies`
  ADD COLUMN `logo_url` VARCHAR(500) NULL,
  ADD COLUMN `branch_limit` INTEGER NOT NULL DEFAULT 1;

UPDATE `companies` AS company
SET `branch_limit` = GREATEST(
  1,
  (
    SELECT COUNT(*)
    FROM `branches` AS branch
    WHERE branch.`company_id` = company.`id`
      AND branch.`active` = true
  )
);

ALTER TABLE `company_modules`
  MODIFY COLUMN `module` ENUM(
    'POS',
    'CAR_WASH',
    'INVENTORY',
    'PURCHASES',
    'ACCOUNTS_RECEIVABLE',
    'ACCOUNTS_PAYABLE',
    'EXPENSES'
  ) NOT NULL;

ALTER TABLE `branch_modules`
  MODIFY COLUMN `module` ENUM(
    'POS',
    'CAR_WASH',
    'INVENTORY',
    'PURCHASES',
    'ACCOUNTS_RECEIVABLE',
    'ACCOUNTS_PAYABLE',
    'EXPENSES'
  ) NOT NULL;

INSERT IGNORE INTO `company_modules` (
  `id`, `company_id`, `module`, `enabled`, `created_at`, `updated_at`
)
SELECT
  UUID(),
  company.`id`,
  module_list.`module`,
  module_list.`enabled`,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM `companies` AS company
CROSS JOIN (
  SELECT 'POS' AS `module`, true AS `enabled`
  UNION ALL SELECT 'CAR_WASH', true
  UNION ALL SELECT 'INVENTORY', false
  UNION ALL SELECT 'PURCHASES', false
  UNION ALL SELECT 'ACCOUNTS_RECEIVABLE', false
  UNION ALL SELECT 'ACCOUNTS_PAYABLE', false
  UNION ALL SELECT 'EXPENSES', false
) AS module_list;

INSERT IGNORE INTO `branch_modules` (
  `id`, `company_id`, `branch_id`, `module`, `enabled`, `created_at`, `updated_at`
)
SELECT
  UUID(),
  branch.`company_id`,
  branch.`id`,
  module_list.`module`,
  module_list.`enabled`,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM `branches` AS branch
CROSS JOIN (
  SELECT 'POS' AS `module`, true AS `enabled`
  UNION ALL SELECT 'CAR_WASH', true
  UNION ALL SELECT 'INVENTORY', false
  UNION ALL SELECT 'PURCHASES', false
  UNION ALL SELECT 'ACCOUNTS_RECEIVABLE', false
  UNION ALL SELECT 'ACCOUNTS_PAYABLE', false
  UNION ALL SELECT 'EXPENSES', false
) AS module_list;

INSERT IGNORE INTO `permissions` (
  `id`,
  `code`,
  `name`,
  `description`
) VALUES
  (
    UUID(),
    'FINANCIAL_DASHBOARD_VIEW',
    'Ver indicadores financieros',
    'Permite consultar los indicadores financieros autorizados del Dashboard.'
  ),
  (
    UUID(),
    'FINANCIAL_DASHBOARD_VIEW_ALL_BRANCHES',
    'Ver indicadores financieros consolidados',
    'Permite consultar el consolidado financiero y seleccionar cualquier sucursal.'
  );

INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT role.`id`, permission.`id`
FROM `roles` AS role
JOIN `permissions` AS permission
  ON permission.`code` IN (
    'FINANCIAL_DASHBOARD_VIEW',
    'FINANCIAL_DASHBOARD_VIEW_ALL_BRANCHES'
  )
WHERE role.`code` = 'ADMIN';
