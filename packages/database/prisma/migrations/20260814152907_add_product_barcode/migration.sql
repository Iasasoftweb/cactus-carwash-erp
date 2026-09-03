/*
  Warnings:

  - A unique constraint covering the columns `[company_id,barcode]` on the table `products` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `products` ADD COLUMN `barcode` VARCHAR(64) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `products_company_id_barcode_key` ON `products`(`company_id`, `barcode`);
