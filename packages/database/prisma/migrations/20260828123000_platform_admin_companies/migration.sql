ALTER TABLE `users`
  ADD COLUMN `is_platform_admin` BOOLEAN NOT NULL DEFAULT false;

UPDATE `users`
SET `is_platform_admin` = true
WHERE `id` = '890ca861-9aaa-11f1-a1f4-7a27b3e5e3e3'
  AND `company_id` = '00000000-0000-0000-0000-000000000001'
  AND `username` = 'admin';
