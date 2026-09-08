ALTER TABLE `pos_financial_configurations`
ADD COLUMN `ticket_print_mode` VARCHAR(16) NOT NULL DEFAULT 'PREVIEW';

UPDATE `pos_financial_configurations`
SET `ticket_print_mode` =
  CASE
    WHEN `ask_print_ticket_after_payment` = true
      THEN 'PREVIEW'
    ELSE 'DIRECT'
  END;

ALTER TABLE `pos_financial_configurations`
DROP COLUMN `ask_print_ticket_after_payment`;
