ALTER TABLE `employees`
  ADD COLUMN `user_id` CHAR(36) NULL AFTER `company_id`;

CREATE UNIQUE INDEX `employees_user_id_key`
  ON `employees`(`user_id`);

ALTER TABLE `employees`
  ADD CONSTRAINT `employees_user_id_fkey`
  FOREIGN KEY (`user_id`)
  REFERENCES `users`(`id`)
  ON DELETE SET NULL
  ON UPDATE CASCADE;

INSERT INTO `employees` (
  `id`,
  `company_id`,
  `user_id`,
  `branch_id`,
  `employee_no`,
  `full_name`,
  `phone`,
  `job_position`,
  `can_operate_cash`,
  `active`,
  `created_at`,
  `updated_at`
)
SELECT
  UUID(),
  u.`company_id`,
  u.`id`,
  assigned.`branch_id`,
  CONCAT('USR-', LEFT(REPLACE(u.`id`, '-', ''), 12)),
  u.`full_name`,
  NULL,
  'Cajero',
  1,
  1,
  NOW(),
  NOW()
FROM `users` u
INNER JOIN (
  SELECT
    ub.`user_id`,
    MIN(ub.`branch_id`) AS `branch_id`
  FROM `user_branches` ub
  GROUP BY ub.`user_id`
  HAVING COUNT(*) = 1
) assigned
  ON assigned.`user_id` = u.`id`
WHERE u.`status` = 'ACTIVE'
  AND u.`branch_access_mode` = 'ASSIGNED'
  AND EXISTS (
    SELECT 1
    FROM `user_roles` ur
    INNER JOIN `roles` r
      ON r.`id` = ur.`role_id`
    WHERE ur.`user_id` = u.`id`
      AND r.`code` = 'CASHIER'
      AND r.`active` = 1
  )
  AND NOT EXISTS (
    SELECT 1
    FROM `employees` e
    WHERE e.`user_id` = u.`id`
  );
