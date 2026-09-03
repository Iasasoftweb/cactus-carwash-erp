ALTER TABLE `inventory_movements`
  MODIFY COLUMN `type` ENUM(
    'INITIAL',
    'PURCHASE',
    'SALE',
    'ADJUSTMENT_IN',
    'ADJUSTMENT_OUT',
    'RETURN_IN',
    'RETURN_OUT',
    'TRANSFER_OUT',
    'TRANSFER_IN'
  ) NOT NULL;
