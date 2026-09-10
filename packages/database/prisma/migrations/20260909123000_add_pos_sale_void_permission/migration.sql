INSERT INTO `permissions` (
  `id`,
  `code`,
  `name`,
  `description`
)
SELECT
  UUID(),
  'POS_SALE_VOID',
  'Anular ventas POS',
  'Permite anular ventas emitidas en POS y ejecutar sus reversiones financieras e inventario.'
WHERE NOT EXISTS (
  SELECT 1
  FROM `permissions`
  WHERE `code` = 'POS_SALE_VOID'
);

INSERT IGNORE INTO `role_permissions` (
  `role_id`,
  `permission_id`
)
SELECT
  r.`id`,
  p.`id`
FROM `roles` r
INNER JOIN `permissions` p
  ON p.`code` = 'POS_SALE_VOID'
WHERE r.`code` = 'ADMIN';
