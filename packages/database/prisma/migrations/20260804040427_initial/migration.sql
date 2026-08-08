/*
  Warnings:

  - A unique constraint covering the columns `[company_id,code]` on the table `service_categories` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `branch_id` to the `employees` table without a default value. This is not possible if the table is not empty.
  - Added the required column `branch_id` to the `service_categories` table without a default value. This is not possible if the table is not empty.
  - Added the required column `company_id` to the `service_categories` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX `service_categories_code_key` ON `service_categories`;

-- AlterTable
ALTER TABLE `employees` ADD COLUMN `branch_id` CHAR(36) NOT NULL;

-- AlterTable
ALTER TABLE `service_categories` ADD COLUMN `branch_id` CHAR(36) NOT NULL,
    ADD COLUMN `company_id` CHAR(36) NOT NULL;

-- CreateTable
CREATE TABLE `number_sequences` (
    `id` CHAR(36) NOT NULL,
    `company_id` CHAR(36) NOT NULL,
    `branch_id` CHAR(36) NOT NULL,
    `document_type` VARCHAR(30) NOT NULL,
    `prefix` VARCHAR(10) NOT NULL,
    `current_value` INTEGER NOT NULL DEFAULT 0,
    `padding` INTEGER NOT NULL DEFAULT 8,
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `number_sequences_branch_id_document_type_key`(`branch_id`, `document_type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `employees_branch_id_active_idx` ON `employees`(`branch_id`, `active`);

-- CreateIndex
CREATE INDEX `service_categories_branch_id_active_idx` ON `service_categories`(`branch_id`, `active`);

-- CreateIndex
CREATE UNIQUE INDEX `service_categories_company_id_code_key` ON `service_categories`(`company_id`, `code`);

-- AddForeignKey
ALTER TABLE `employees` ADD CONSTRAINT `employees_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `service_categories` ADD CONSTRAINT `service_categories_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `service_categories` ADD CONSTRAINT `service_categories_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `number_sequences` ADD CONSTRAINT `number_sequences_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
