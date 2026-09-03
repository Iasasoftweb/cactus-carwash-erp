-- AddForeignKey
ALTER TABLE `cash_registers` ADD CONSTRAINT `cash_registers_operational_area_id_fkey` FOREIGN KEY (`operational_area_id`) REFERENCES `operational_areas`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
