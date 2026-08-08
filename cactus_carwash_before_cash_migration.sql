/*M!999999\- enable the sandbox mode */ 
-- MariaDB dump 10.19-12.3.2-MariaDB, for Linux (x86_64)
--
-- Host: 127.0.0.1    Database: cactus_carwash
-- ------------------------------------------------------
-- Server version	8.4.11

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*M!100616 SET @OLD_NOTE_VERBOSITY=@@NOTE_VERBOSITY, NOTE_VERBOSITY=0 */;

--
-- Table structure for table `_prisma_migrations`
--

DROP TABLE IF EXISTS `_prisma_migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_prisma_migrations` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `checksum` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `finished_at` datetime(3) DEFAULT NULL,
  `migration_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `logs` text COLLATE utf8mb4_unicode_ci,
  `rolled_back_at` datetime(3) DEFAULT NULL,
  `started_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `applied_steps_count` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_prisma_migrations`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `_prisma_migrations` WRITE;
/*!40000 ALTER TABLE `_prisma_migrations` DISABLE KEYS */;
INSERT INTO `_prisma_migrations` VALUES
('0be8cf41-b3df-45b8-aabc-e6cfd735779b','0a8b7aa9c6c1c619bd8b4b051f589f07f55b375d474f1edf87a2ac35d2ae8bc0','2026-08-04 03:09:25.804','20260804030924_initial',NULL,NULL,'2026-08-04 03:09:24.712',1),
('156d489a-b006-43cc-b1c8-4682fc9dd731','bc6b3cd156048d6deac5074a2ef04bf70f122b40b676574842dfedd29965e8ff','2026-08-05 18:18:30.658','20260805181830_coffeebar_pos_hold_payment',NULL,NULL,'2026-08-05 18:18:30.600',1),
('497b6702-8b4e-4d58-bf9d-7b54921cdf72','b15dcc63c46ac6d1c02a017e7884ae8cc034cf79450d76a3765d5cfe62f226d4','2026-08-05 13:35:25.325','20260805133525_coffee_bar_accounts',NULL,NULL,'2026-08-05 13:35:25.141',1),
('4ecd65ab-0b0a-4462-a002-afd1f4314944','86b37ca979545e26264ad35b5db8952aa3888e025b584fe2f69d7a8f209d96d1','2026-08-04 04:04:27.310','20260804040427_initial',NULL,NULL,'2026-08-04 04:04:27.159',1),
('599ad43c-e139-4c12-8dd2-16d38eb8d1ac','92acfb1b362d4d0503c428c5dc5843e983d6061239c06ba18035282b1d096d01','2026-08-05 12:00:01.216','20260805120000_pos_retail_foundation',NULL,NULL,'2026-08-05 12:00:00.815',1),
('f6a22c9a-d0e9-4f11-b821-d9714b9c659a','a219b05e346cb6173316df8dd10013095e6fd3173702d7bd41b6fe3795c5181a','2026-08-05 10:23:16.838','20260805102316_order_center',NULL,NULL,'2026-08-05 10:23:16.745',1),
('fd536afd-5192-4560-8ac2-3b0c01b17169','6605ad49b1213a492c176902f21d029c8da55e3d2d511144b66cc7398e4e9b41','2026-08-05 11:18:35.348','20260805111835_operational_areas_tickets',NULL,NULL,'2026-08-05 11:18:35.184',1),
('ff5e3f3b-92e4-427e-9707-7cef938a5c36','962d89c7a44bba69a4d1c14ccfa32bfa9621e74b221dfa794ddb96f56f33d9ee',NULL,'20260806014846_cash_employee_integrity','A migration failed to apply. New migrations cannot be applied before the error is recovered from. Read more about how to resolve migration issues in a production database: https://pris.ly/d/migrate-resolve\n\nMigration name: 20260806014846_cash_employee_integrity\n\nDatabase error code: 1452\n\nDatabase error:\nCannot add or update a child row: a foreign key constraint fails (`cactus_carwash`.`#sql-1_1194`, CONSTRAINT `cash_sessions_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE)\n\nPlease check the query number 5 from the migration file.\n\n   0: sql_schema_connector::apply_migration::apply_script\n           with migration_name=\"20260806014846_cash_employee_integrity\"\n             at schema-engine/connectors/sql-schema-connector/src/apply_migration.rs:113\n   1: schema_commands::commands::apply_migrations::Applying migration\n           with migration_name=\"20260806014846_cash_employee_integrity\"\n             at schema-engine/commands/src/commands/apply_migrations.rs:95\n   2: schema_core::state::ApplyMigrations\n             at schema-engine/core/src/state.rs:260',NULL,'2026-08-06 01:49:10.335',0);
/*!40000 ALTER TABLE `_prisma_migrations` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `audit_logs`
--

DROP TABLE IF EXISTS `audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `audit_logs` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `company_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `action` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity_type` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `reason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `old_values` json DEFAULT NULL,
  `new_values` json DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `audit_logs_entity_type_entity_id_created_at_idx` (`entity_type`,`entity_id`,`created_at`),
  KEY `audit_logs_company_id_fkey` (`company_id`),
  KEY `audit_logs_user_id_fkey` (`user_id`),
  CONSTRAINT `audit_logs_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `audit_logs_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `audit_logs`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `audit_logs` WRITE;
/*!40000 ALTER TABLE `audit_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `audit_logs` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `branches`
--

DROP TABLE IF EXISTS `branches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `branches` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `company_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(160) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `address` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `branches_company_id_code_key` (`company_id`,`code`),
  KEY `branches_company_id_active_idx` (`company_id`,`active`),
  CONSTRAINT `branches_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `branches`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `branches` WRITE;
/*!40000 ALTER TABLE `branches` DISABLE KEYS */;
INSERT INTO `branches` VALUES
('d21ca67b-54fd-4336-a413-f3a0b5436dd5','00000000-0000-0000-0000-000000000001','Sucursal Principal','MAIN',NULL,NULL,1,'2026-08-04 03:09:38.077','2026-08-05 13:48:37.935');
/*!40000 ALTER TABLE `branches` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `cash_movements`
--

DROP TABLE IF EXISTS `cash_movements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `cash_movements` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cash_session_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` enum('OPENING','SALE','COLLECTION','EXPENSE','WITHDRAWAL','DEPOSIT','ADJUSTMENT','CLOSING') COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` decimal(14,2) NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `reference_type` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reference_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `beneficiary` varchar(160) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `external_reference` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `cash_movements_cash_session_id_created_at_idx` (`cash_session_id`,`created_at`),
  CONSTRAINT `cash_movements_cash_session_id_fkey` FOREIGN KEY (`cash_session_id`) REFERENCES `cash_sessions` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cash_movements`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `cash_movements` WRITE;
/*!40000 ALTER TABLE `cash_movements` DISABLE KEYS */;
INSERT INTO `cash_movements` VALUES
('1caa2c6e-0d29-4a12-8251-d645cb68bd75','bde2165f-5447-46cc-8311-98baf603f47d','CLOSING',0.00,'Conteo final y cierre de caja.',NULL,NULL,'2026-08-06 00:53:47.291',NULL,NULL),
('38833f6e-4040-4371-898b-f108f605db0f','f2693c2b-349e-4349-bb13-4e1e5995822c','CLOSING',4000.00,'Conteo final y cierre de caja.',NULL,NULL,'2026-08-06 01:10:01.223',NULL,NULL),
('64e1825d-00de-468e-88fa-703b84c76717','f2693c2b-349e-4349-bb13-4e1e5995822c','DEPOSIT',3000.00,'Facturas',NULL,NULL,'2026-08-06 01:00:38.936',NULL,NULL),
('9e10b603-d4aa-4835-b9e9-27bd2a32d32a','bde2165f-5447-46cc-8311-98baf603f47d','OPENING',3000.00,'Fondo inicial de caja.',NULL,NULL,'2026-08-06 00:32:56.392',NULL,NULL),
('a01b5490-1134-4c29-9ca5-f993d5aaa347','f2693c2b-349e-4349-bb13-4e1e5995822c','OPENING',1000.00,'Fondo inicial de caja.',NULL,NULL,'2026-08-06 01:00:02.803',NULL,NULL);
/*!40000 ALTER TABLE `cash_movements` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `cash_registers`
--

DROP TABLE IF EXISTS `cash_registers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `cash_registers` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `branch_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `operational_area_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `point_of_sale_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `cash_registers_branch_id_code_key` (`branch_id`,`code`),
  KEY `cash_registers_point_of_sale_id_active_idx` (`point_of_sale_id`,`active`),
  CONSTRAINT `cash_registers_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `cash_registers_point_of_sale_id_fkey` FOREIGN KEY (`point_of_sale_id`) REFERENCES `points_of_sale` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cash_registers`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `cash_registers` WRITE;
/*!40000 ALTER TABLE `cash_registers` DISABLE KEYS */;
INSERT INTO `cash_registers` VALUES
('4fc748a3-769f-471a-b036-17ac58cc2490','d21ca67b-54fd-4336-a413-f3a0b5436dd5','COFFEE_BAR_CASH','Caja Coffee Bar',1,NULL,'c76cc9ce-55e8-4300-9a55-3fffadf953dc'),
('62de50e9-2e74-4fe9-b33b-4720b0acf2ac','d21ca67b-54fd-4336-a413-f3a0b5436dd5','MAIN_CASH','Caja Recepción',1,NULL,NULL);
/*!40000 ALTER TABLE `cash_registers` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `cash_sessions`
--

DROP TABLE IF EXISTS `cash_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `cash_sessions` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cash_register_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('OPEN','CLOSED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'OPEN',
  `opening_amount` decimal(14,2) NOT NULL,
  `expected_amount` decimal(14,2) DEFAULT NULL,
  `counted_amount` decimal(14,2) DEFAULT NULL,
  `difference` decimal(14,2) DEFAULT NULL,
  `opened_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `closed_at` datetime(3) DEFAULT NULL,
  `cashier_name_snapshot` varchar(160) COLLATE utf8mb4_unicode_ci NOT NULL,
  `employee_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  KEY `cash_sessions_cash_register_id_status_idx` (`cash_register_id`,`status`),
  KEY `cash_sessions_user_id_opened_at_idx` (`user_id`,`opened_at`),
  KEY `cash_sessions_employee_id_opened_at_idx` (`employee_id`,`opened_at`),
  CONSTRAINT `cash_sessions_cash_register_id_fkey` FOREIGN KEY (`cash_register_id`) REFERENCES `cash_registers` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `cash_sessions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cash_sessions`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `cash_sessions` WRITE;
/*!40000 ALTER TABLE `cash_sessions` DISABLE KEYS */;
INSERT INTO `cash_sessions` VALUES
('bde2165f-5447-46cc-8311-98baf603f47d','4fc748a3-769f-471a-b036-17ac58cc2490','0f1617f5-2bfd-499e-ab25-eef79b170ca1','CLOSED',3000.00,3000.00,0.00,-3000.00,'2026-08-06 00:32:56.391','2026-08-06 00:53:47.292','',''),
('f2693c2b-349e-4349-bb13-4e1e5995822c','4fc748a3-769f-471a-b036-17ac58cc2490','5ae00bb2-3c79-4253-9a07-a69a0790e7d3','CLOSED',1000.00,4000.00,4000.00,0.00,'2026-08-06 01:00:02.801','2026-08-06 01:10:01.223','','');
/*!40000 ALTER TABLE `cash_sessions` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `companies`
--

DROP TABLE IF EXISTS `companies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `companies` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(160) COLLATE utf8mb4_unicode_ci NOT NULL,
  `legal_name` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tax_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `currency_code` char(3) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'DOP',
  `currency_symbol` varchar(8) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'RD$',
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `companies`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `companies` WRITE;
/*!40000 ALTER TABLE `companies` DISABLE KEYS */;
INSERT INTO `companies` VALUES
('00000000-0000-0000-0000-000000000001','Cactus CarWash',NULL,NULL,'DOP','RD$',1,'2026-08-04 03:09:38.067','2026-08-04 03:09:38.067');
/*!40000 ALTER TABLE `companies` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `customers`
--

DROP TABLE IF EXISTS `customers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `customers` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `company_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` enum('GENERAL','REGISTERED','CREDIT') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'GENERAL',
  `display_name` varchar(160) COLLATE utf8mb4_unicode_ci NOT NULL,
  `legal_name` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(180) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tax_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `credit_enabled` tinyint(1) NOT NULL DEFAULT '0',
  `credit_limit` decimal(14,2) NOT NULL DEFAULT '0.00',
  `credit_days` int NOT NULL DEFAULT '0',
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `customers_company_id_display_name_idx` (`company_id`,`display_name`),
  KEY `customers_company_id_phone_idx` (`company_id`,`phone`),
  CONSTRAINT `customers_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customers`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `customers` WRITE;
/*!40000 ALTER TABLE `customers` DISABLE KEYS */;
/*!40000 ALTER TABLE `customers` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `employee_commission_rules`
--

DROP TABLE IF EXISTS `employee_commission_rules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee_commission_rules` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `employee_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `service_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` enum('PERCENTAGE','FIXED_AMOUNT','NONE') COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` decimal(14,4) NOT NULL DEFAULT '0.0000',
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `valid_from` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `valid_to` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `employee_commission_rules_employee_id_service_id_active_idx` (`employee_id`,`service_id`,`active`),
  KEY `employee_commission_rules_service_id_fkey` (`service_id`),
  CONSTRAINT `employee_commission_rules_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `employee_commission_rules_service_id_fkey` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `employee_commission_rules`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `employee_commission_rules` WRITE;
/*!40000 ALTER TABLE `employee_commission_rules` DISABLE KEYS */;
INSERT INTO `employee_commission_rules` VALUES
('1bf504cd-ddc0-4b0f-b21a-a71980ae8191','94056e8a-5b05-4422-ab4d-5910f130ee1e','165a7d47-0521-4d24-b2b1-6f7537066d66','PERCENTAGE',15.0000,1,'2026-08-04 04:05:18.670',NULL),
('201c7697-e0a5-4bec-9caf-a40638de08d1','fdc4ca1b-9e6d-4f37-b59f-60f068e58259','165a7d47-0521-4d24-b2b1-6f7537066d66','PERCENTAGE',15.0000,1,'2026-08-04 04:05:18.684',NULL),
('29209b6d-ea4e-4e79-85b3-eb156bb1f383','fdc4ca1b-9e6d-4f37-b59f-60f068e58259','55cab1f3-ca36-4962-927e-5025bdbf437e','PERCENTAGE',15.0000,1,'2026-08-04 04:05:18.680',NULL),
('324c28bc-2bf3-4a3d-b611-4fe25d54916e','94872e21-4597-404c-9fa0-e2b14384b657','165a7d47-0521-4d24-b2b1-6f7537066d66','PERCENTAGE',15.0000,1,'2026-08-04 04:05:18.659',NULL),
('447c6f06-c93f-4fd2-84a5-0cfcdd16914c','fdc4ca1b-9e6d-4f37-b59f-60f068e58259','34e1045b-cfaa-4bcf-b944-c48345255270','PERCENTAGE',15.0000,1,'2026-08-04 04:05:18.689',NULL),
('61510685-8d88-41e7-a27b-2dde808aad12','4122fb04-bc9b-4736-943a-85d51d3e5ad7','d1a1c777-6efa-4ee2-be5d-430cdcd6ec48','PERCENTAGE',15.0000,1,'2026-08-04 04:05:18.651',NULL),
('671e36ee-62c6-4cba-b2d4-07fdabdf6b02','4122fb04-bc9b-4736-943a-85d51d3e5ad7','5ec6d170-a143-430b-af7d-dde0e54f2bda','PERCENTAGE',15.0000,1,'2026-08-04 04:05:18.646',NULL),
('6e564763-a82f-4745-a78a-5054cc79eb97','94872e21-4597-404c-9fa0-e2b14384b657','e07c1871-5515-40a4-967a-cfba0ae56b6d','PERCENTAGE',15.0000,1,'2026-08-04 04:05:18.661',NULL),
('7585a083-dd08-4f34-a626-241e9c7f29ed','94056e8a-5b05-4422-ab4d-5910f130ee1e','55cab1f3-ca36-4962-927e-5025bdbf437e','PERCENTAGE',15.0000,1,'2026-08-04 04:05:18.667',NULL),
('76e1f2ec-03ce-4d2c-ba5f-1bdb9567acf8','94872e21-4597-404c-9fa0-e2b14384b657','5ec6d170-a143-430b-af7d-dde0e54f2bda','PERCENTAGE',15.0000,1,'2026-08-04 04:05:18.657',NULL),
('77aa884b-f5c0-49f7-8329-6e2ddfe7dc64','94872e21-4597-404c-9fa0-e2b14384b657','34e1045b-cfaa-4bcf-b944-c48345255270','PERCENTAGE',15.0000,1,'2026-08-04 04:05:18.664',NULL),
('a3167f54-6074-4992-b3bc-0346e00014e4','fdc4ca1b-9e6d-4f37-b59f-60f068e58259','e07c1871-5515-40a4-967a-cfba0ae56b6d','PERCENTAGE',15.0000,1,'2026-08-04 04:05:18.686',NULL),
('a5cd7f17-6155-48c1-8c0a-a2cc213f13b0','94056e8a-5b05-4422-ab4d-5910f130ee1e','5ec6d170-a143-430b-af7d-dde0e54f2bda','PERCENTAGE',15.0000,1,'2026-08-04 04:05:18.669',NULL),
('ab2bd798-2825-42a5-89c2-f9ddec8eaaca','94056e8a-5b05-4422-ab4d-5910f130ee1e','d1a1c777-6efa-4ee2-be5d-430cdcd6ec48','PERCENTAGE',15.0000,1,'2026-08-04 04:05:18.674',NULL),
('abe4cfc5-5c1d-4147-958c-2991293e4833','94056e8a-5b05-4422-ab4d-5910f130ee1e','34e1045b-cfaa-4bcf-b944-c48345255270','PERCENTAGE',15.0000,1,'2026-08-04 04:05:18.676',NULL),
('c3d81112-0990-43b0-ad0d-f3f2de941ba5','4122fb04-bc9b-4736-943a-85d51d3e5ad7','55cab1f3-ca36-4962-927e-5025bdbf437e','PERCENTAGE',15.0000,1,'2026-08-04 04:05:18.645',NULL),
('d1f41c1f-aa18-4cab-9388-a45b99c4ff2a','94872e21-4597-404c-9fa0-e2b14384b657','55cab1f3-ca36-4962-927e-5025bdbf437e','PERCENTAGE',15.0000,1,'2026-08-04 04:05:18.656',NULL),
('d3e6cab0-28b0-4291-99e2-5a62a4cd61f4','fdc4ca1b-9e6d-4f37-b59f-60f068e58259','5ec6d170-a143-430b-af7d-dde0e54f2bda','PERCENTAGE',15.0000,1,'2026-08-04 04:05:18.682',NULL),
('dccc7d5d-3f10-49ed-9129-70bf3abcd20a','94056e8a-5b05-4422-ab4d-5910f130ee1e','e07c1871-5515-40a4-967a-cfba0ae56b6d','PERCENTAGE',15.0000,1,'2026-08-04 04:05:18.672',NULL),
('dcce1272-9f2d-463e-9944-ec55770fed7a','fdc4ca1b-9e6d-4f37-b59f-60f068e58259','d1a1c777-6efa-4ee2-be5d-430cdcd6ec48','PERCENTAGE',15.0000,1,'2026-08-04 04:05:18.687',NULL),
('e2a32672-59ef-40dd-ae99-d2379396c577','94872e21-4597-404c-9fa0-e2b14384b657','d1a1c777-6efa-4ee2-be5d-430cdcd6ec48','PERCENTAGE',15.0000,1,'2026-08-04 04:05:18.662',NULL),
('e3a151ce-e615-406e-8f6f-701956b08d3e','4122fb04-bc9b-4736-943a-85d51d3e5ad7','34e1045b-cfaa-4bcf-b944-c48345255270','PERCENTAGE',15.0000,1,'2026-08-04 04:05:18.653',NULL),
('e8966e02-b8c8-4576-9d3e-acfe319a74c9','4122fb04-bc9b-4736-943a-85d51d3e5ad7','165a7d47-0521-4d24-b2b1-6f7537066d66','PERCENTAGE',15.0000,1,'2026-08-04 04:05:18.648',NULL),
('ee2b84ae-b12b-409f-bd02-904ed9b0863d','4122fb04-bc9b-4736-943a-85d51d3e5ad7','e07c1871-5515-40a4-967a-cfba0ae56b6d','PERCENTAGE',15.0000,1,'2026-08-04 04:05:18.650',NULL);
/*!40000 ALTER TABLE `employee_commission_rules` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `employees`
--

DROP TABLE IF EXISTS `employees`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `employees` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `company_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `employee_no` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `full_name` varchar(160) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  `branch_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `can_operate_cash` tinyint(1) NOT NULL DEFAULT '0',
  `job_position` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `employees_company_id_employee_no_key` (`company_id`,`employee_no`),
  KEY `employees_branch_id_active_idx` (`branch_id`,`active`),
  CONSTRAINT `employees_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `employees_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `employees`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `employees` WRITE;
/*!40000 ALTER TABLE `employees` DISABLE KEYS */;
INSERT INTO `employees` VALUES
('4122fb04-bc9b-4736-943a-85d51d3e5ad7','00000000-0000-0000-0000-000000000001','EMP-001','Juan Pérez',NULL,1,'2026-08-04 04:05:18.641','2026-08-05 13:48:38.001','d21ca67b-54fd-4336-a413-f3a0b5436dd5',0,NULL),
('94056e8a-5b05-4422-ab4d-5910f130ee1e','00000000-0000-0000-0000-000000000001','EMP-003','Carlos Díaz',NULL,1,'2026-08-04 04:05:18.665','2026-08-05 13:48:38.017','d21ca67b-54fd-4336-a413-f3a0b5436dd5',0,NULL),
('94872e21-4597-404c-9fa0-e2b14384b657','00000000-0000-0000-0000-000000000001','EMP-002','Pedro Gómez',NULL,1,'2026-08-04 04:05:18.654','2026-08-05 13:48:38.010','d21ca67b-54fd-4336-a413-f3a0b5436dd5',0,NULL),
('fdc4ca1b-9e6d-4f37-b59f-60f068e58259','00000000-0000-0000-0000-000000000001','EMP-004','Luis Martínez',NULL,1,'2026-08-04 04:05:18.678','2026-08-05 13:48:38.023','d21ca67b-54fd-4336-a413-f3a0b5436dd5',0,NULL);
/*!40000 ALTER TABLE `employees` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `invoice_items`
--

DROP TABLE IF EXISTS `invoice_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `invoice_items` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `invoice_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `order_item_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(180) COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity` decimal(12,3) NOT NULL,
  `unit_price` decimal(14,2) NOT NULL,
  `tax_amount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `line_total` decimal(14,2) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `invoice_items_invoice_id_order_item_id_key` (`invoice_id`,`order_item_id`),
  KEY `invoice_items_order_item_id_fkey` (`order_item_id`),
  CONSTRAINT `invoice_items_invoice_id_fkey` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `invoice_items_order_item_id_fkey` FOREIGN KEY (`order_item_id`) REFERENCES `service_order_items` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `invoice_items`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `invoice_items` WRITE;
/*!40000 ALTER TABLE `invoice_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `invoice_items` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `invoices`
--

DROP TABLE IF EXISTS `invoices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `invoices` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `order_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `invoice_number` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('ISSUED','PARTIALLY_PAID','PAID','CREDIT','CREDIT_NOTED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ISSUED',
  `subtotal` decimal(14,2) NOT NULL,
  `tax_amount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `total` decimal(14,2) NOT NULL,
  `balance` decimal(14,2) NOT NULL,
  `issued_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `due_date` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `invoices_order_id_key` (`order_id`),
  UNIQUE KEY `invoices_invoice_number_key` (`invoice_number`),
  KEY `invoices_customer_id_status_due_date_idx` (`customer_id`,`status`,`due_date`),
  CONSTRAINT `invoices_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `invoices_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `service_orders` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `invoices`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `invoices` WRITE;
/*!40000 ALTER TABLE `invoices` DISABLE KEYS */;
/*!40000 ALTER TABLE `invoices` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `number_sequences`
--

DROP TABLE IF EXISTS `number_sequences`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `number_sequences` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `company_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `branch_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `document_type` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `prefix` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `current_value` int NOT NULL DEFAULT '0',
  `padding` int NOT NULL DEFAULT '8',
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `number_sequences_branch_id_document_type_key` (`branch_id`,`document_type`),
  KEY `number_sequences_company_id_fkey` (`company_id`),
  CONSTRAINT `number_sequences_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `number_sequences`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `number_sequences` WRITE;
/*!40000 ALTER TABLE `number_sequences` DISABLE KEYS */;
INSERT INTO `number_sequences` VALUES
('a1588aac-cc49-4aea-9c13-49a5e5b4f436','00000000-0000-0000-0000-000000000001','d21ca67b-54fd-4336-a413-f3a0b5436dd5','SERVICE_ORDER','ORD',11,8,'2026-08-05 11:33:54.314');
/*!40000 ALTER TABLE `number_sequences` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `operational_areas`
--

DROP TABLE IF EXISTS `operational_areas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `operational_areas` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `company_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `branch_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ticket_prefix` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `color` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `icon` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `printer_name` varchar(160) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `print_copies` int NOT NULL DEFAULT '1',
  `auto_print` tinyint(1) NOT NULL DEFAULT '1',
  `sla_minutes` int DEFAULT NULL,
  `sort_order` int NOT NULL DEFAULT '0',
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `operational_areas_branch_id_code_key` (`branch_id`,`code`),
  KEY `operational_areas_company_id_active_idx` (`company_id`,`active`),
  CONSTRAINT `operational_areas_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `operational_areas_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `operational_areas`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `operational_areas` WRITE;
/*!40000 ALTER TABLE `operational_areas` DISABLE KEYS */;
INSERT INTO `operational_areas` VALUES
('3576f21a-04ae-4bac-8a3f-637c7e326f15','00000000-0000-0000-0000-000000000001','d21ca67b-54fd-4336-a413-f3a0b5436dd5','LAV','Lavado','LAV','#1f5c3f','droplets',NULL,1,1,25,0,1,'2026-08-05 11:18:49.172','2026-08-05 13:48:37.948'),
('70e6c4c8-4796-441d-bcf6-19e954a83c1e','00000000-0000-0000-0000-000000000001','d21ca67b-54fd-4336-a413-f3a0b5436dd5','TAL','Taller','TAL','#345f9d','wrench',NULL,1,1,90,0,1,'2026-08-05 11:18:49.180','2026-08-05 13:48:37.950');
/*!40000 ALTER TABLE `operational_areas` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `order_checklist_items`
--

DROP TABLE IF EXISTS `order_checklist_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `order_checklist_items` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `order_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `label` varchar(160) COLLATE utf8mb4_unicode_ci NOT NULL,
  `checked` tinyint(1) NOT NULL DEFAULT '0',
  `notes` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_at` datetime(3) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `order_checklist_items_order_id_code_key` (`order_id`,`code`),
  KEY `order_checklist_items_order_id_checked_idx` (`order_id`,`checked`),
  CONSTRAINT `order_checklist_items_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `service_orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `order_checklist_items`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `order_checklist_items` WRITE;
/*!40000 ALTER TABLE `order_checklist_items` DISABLE KEYS */;
INSERT INTO `order_checklist_items` VALUES
('05a27682-63aa-4f3f-976f-57870f8e0dce','be72ddd1-2ecb-4c7b-b2d0-56619460ec63','SCRATCHES','Rayones existentes verificados',0,NULL,'2026-08-05 12:30:04.660','2026-08-05 12:30:04.660'),
('0dfeff5b-dcfa-4372-abc6-47cf506cd1ca','be72ddd1-2ecb-4c7b-b2d0-56619460ec63','DENTS','Golpes existentes verificados',0,NULL,'2026-08-05 12:30:04.660','2026-08-05 12:30:04.660'),
('0f8d4cb3-2d76-44e1-ae1b-78da95a9c7bd','cb1f655b-1159-4b5c-bff3-47cbab11fdc4','PERSONAL_ITEMS','Objetos personales verificados',0,NULL,'2026-08-05 11:33:54.318','2026-08-05 11:33:54.318'),
('1365da77-d992-40da-87e9-03bbda62b190','be72ddd1-2ecb-4c7b-b2d0-56619460ec63','SPARE_TIRE','Goma de repuesto',0,NULL,'2026-08-05 12:30:04.660','2026-08-05 12:30:04.660'),
('16812c84-2381-4145-90b2-41c810032933','cb1f655b-1159-4b5c-bff3-47cbab11fdc4','SCRATCHES','Rayones existentes verificados',0,NULL,'2026-08-05 11:33:54.318','2026-08-05 11:33:54.318'),
('1e31174f-10f2-4baf-abf2-b05c9c962b41','3ef8b6a5-5b20-4f13-8001-93f4562d57c0','KEYS','Llaves entregadas',0,NULL,'2026-08-05 11:27:57.481','2026-08-05 11:27:57.481'),
('200fe763-8be3-4dba-9b0d-e211173f1b8e','3ef8b6a5-5b20-4f13-8001-93f4562d57c0','FUEL','Nivel de combustible verificado',0,NULL,'2026-08-05 11:27:57.481','2026-08-05 11:27:57.481'),
('22431216-157a-474e-a9af-a9c6f7dc0588','be72ddd1-2ecb-4c7b-b2d0-56619460ec63','FUEL','Nivel de combustible verificado',0,NULL,'2026-08-05 12:30:04.660','2026-08-05 12:30:04.660'),
('2805829f-4317-49ee-a4e5-b45f811641f4','5cde3130-9a5c-48f6-ac87-883418c02efd','PERSONAL_ITEMS','Objetos personales verificados',0,NULL,'2026-08-05 10:28:53.004','2026-08-05 10:27:41.787'),
('28a42831-bb78-4238-8823-5a49e7ee8699','5cde3130-9a5c-48f6-ac87-883418c02efd','DENTS','Golpes existentes verificados',0,NULL,'2026-08-05 10:27:41.787','2026-08-05 10:27:41.787'),
('2d2f607c-b8ae-4a41-a636-2d9f5bc66e32','c3b4437a-0850-4e8c-97ae-ac79aecda524','DENTS','Golpes existentes verificados',0,NULL,'2026-08-05 11:28:42.238','2026-08-05 11:28:42.238'),
('31a69e81-7f36-42b4-90b9-b78cae3842ce','3ef8b6a5-5b20-4f13-8001-93f4562d57c0','SCRATCHES','Rayones existentes verificados',0,NULL,'2026-08-05 11:27:57.481','2026-08-05 11:27:57.481'),
('38bd7ec3-5e31-4c3d-906c-fe12da46f67c','5cde3130-9a5c-48f6-ac87-883418c02efd','KEYS','Llaves entregadas',0,NULL,'2026-08-05 10:27:41.787','2026-08-05 10:27:41.787'),
('3b27ef22-bd05-4396-bff5-822da36a606a','be72ddd1-2ecb-4c7b-b2d0-56619460ec63','AC','Aire acondicionado',0,NULL,'2026-08-05 12:30:04.660','2026-08-05 12:30:04.660'),
('4c1cb053-67b1-4e90-a812-f95faf5706a9','3ef8b6a5-5b20-4f13-8001-93f4562d57c0','DENTS','Golpes existentes verificados',0,NULL,'2026-08-05 11:27:57.481','2026-08-05 11:27:57.481'),
('5fc042c9-fee3-4110-bd09-676986584048','cb1f655b-1159-4b5c-bff3-47cbab11fdc4','TOOLS','Herramientas',0,NULL,'2026-08-05 11:33:54.318','2026-08-05 11:33:54.318'),
('60085575-4f50-475f-a6e4-a87a3b75c7dc','be72ddd1-2ecb-4c7b-b2d0-56619460ec63','KEYS','Llaves entregadas',0,NULL,'2026-08-05 12:30:04.660','2026-08-05 12:30:04.660'),
('682856df-3fc8-4948-a584-d97ef99eb090','5cde3130-9a5c-48f6-ac87-883418c02efd','FUEL','Nivel de combustible verificado',0,NULL,'2026-08-05 10:27:41.787','2026-08-05 10:27:41.787'),
('6fcdef98-7791-4a71-8d15-3cf521970b43','c3b4437a-0850-4e8c-97ae-ac79aecda524','SPARE_TIRE','Goma de repuesto',0,NULL,'2026-08-05 11:28:42.238','2026-08-05 11:28:42.238'),
('7090a62b-81e8-4a7a-9bf6-fe85f622986a','c3b4437a-0850-4e8c-97ae-ac79aecda524','FUEL','Nivel de combustible verificado',0,NULL,'2026-08-05 11:28:42.238','2026-08-05 11:28:42.238'),
('7d0ab218-9f43-4842-8d8c-ed4e7947a189','cb1f655b-1159-4b5c-bff3-47cbab11fdc4','AC','Aire acondicionado',0,NULL,'2026-08-05 11:33:54.318','2026-08-05 11:33:54.318'),
('83fb38ba-16d0-4b19-b780-22fe38671982','5cde3130-9a5c-48f6-ac87-883418c02efd','SPARE_TIRE','Goma de repuesto',0,NULL,'2026-08-05 10:27:41.787','2026-08-05 10:27:41.787'),
('908dd250-f65e-45e5-b4ba-e6a685108d1f','c3b4437a-0850-4e8c-97ae-ac79aecda524','SCRATCHES','Rayones existentes verificados',0,NULL,'2026-08-05 11:28:42.238','2026-08-05 11:28:42.238'),
('90dd1aea-1554-4ba5-8ad7-1be3e6172671','be72ddd1-2ecb-4c7b-b2d0-56619460ec63','TOOLS','Herramientas',0,NULL,'2026-08-05 12:30:04.660','2026-08-05 12:30:04.660'),
('a1ab33e4-169e-447a-bcea-ca3c1d954973','5cde3130-9a5c-48f6-ac87-883418c02efd','SCRATCHES','Rayones existentes verificados',0,NULL,'2026-08-05 10:27:41.787','2026-08-05 10:27:41.787'),
('a31cc5f6-af9f-4ad0-85f1-572f26982c94','c3b4437a-0850-4e8c-97ae-ac79aecda524','AC','Aire acondicionado',0,NULL,'2026-08-05 11:28:42.238','2026-08-05 11:28:42.238'),
('a385c4b3-6bd4-4a62-aba9-b3782901c087','cb1f655b-1159-4b5c-bff3-47cbab11fdc4','DENTS','Golpes existentes verificados',0,NULL,'2026-08-05 11:33:54.318','2026-08-05 11:33:54.318'),
('afda0eca-4051-49bf-88dd-2efed72f17e9','cb1f655b-1159-4b5c-bff3-47cbab11fdc4','FUEL','Nivel de combustible verificado',0,NULL,'2026-08-05 11:33:54.318','2026-08-05 11:33:54.318'),
('b05dd0c4-c18b-4c01-8b1c-13046eaf28e9','be72ddd1-2ecb-4c7b-b2d0-56619460ec63','RADIO','Radio funcionando',0,NULL,'2026-08-05 12:30:04.660','2026-08-05 12:30:04.660'),
('b15eeb8c-ad45-4a1e-a539-60672d50f1db','3ef8b6a5-5b20-4f13-8001-93f4562d57c0','RADIO','Radio funcionando',0,NULL,'2026-08-05 11:27:57.481','2026-08-05 11:27:57.481'),
('ba6ed87b-c76d-4d30-9ba3-56b9a8c476f3','c3b4437a-0850-4e8c-97ae-ac79aecda524','TOOLS','Herramientas',0,NULL,'2026-08-05 11:28:42.238','2026-08-05 11:28:42.238'),
('bfa0f678-ae31-4e02-9b30-6b7a7cd89d52','3ef8b6a5-5b20-4f13-8001-93f4562d57c0','PERSONAL_ITEMS','Objetos personales verificados',0,NULL,'2026-08-05 11:27:57.481','2026-08-05 11:27:57.481'),
('bfebe5a6-dfe9-4db4-9362-6d48ca27fb41','be72ddd1-2ecb-4c7b-b2d0-56619460ec63','PERSONAL_ITEMS','Objetos personales verificados',0,NULL,'2026-08-05 12:30:04.660','2026-08-05 12:30:04.660'),
('c257f5be-0aef-4ef3-b0e2-138316165975','5cde3130-9a5c-48f6-ac87-883418c02efd','TOOLS','Herramientas',0,NULL,'2026-08-05 10:27:41.787','2026-08-05 10:27:41.787'),
('c3bf770b-2d9c-4250-ab1f-e81d66fb35c8','5cde3130-9a5c-48f6-ac87-883418c02efd','RADIO','Radio funcionando',0,NULL,'2026-08-05 10:27:41.787','2026-08-05 10:27:41.787'),
('c956e7ce-9d69-470b-b3a0-a1484320074a','cb1f655b-1159-4b5c-bff3-47cbab11fdc4','SPARE_TIRE','Goma de repuesto',0,NULL,'2026-08-05 11:33:54.318','2026-08-05 11:33:54.318'),
('d13eec36-6ae2-4dcd-ae7b-858eaa982275','3ef8b6a5-5b20-4f13-8001-93f4562d57c0','TOOLS','Herramientas',0,NULL,'2026-08-05 11:27:57.481','2026-08-05 11:27:57.481'),
('d60ae326-807b-4724-9735-1f028f685e63','3ef8b6a5-5b20-4f13-8001-93f4562d57c0','AC','Aire acondicionado',0,NULL,'2026-08-05 11:27:57.481','2026-08-05 11:27:57.481'),
('df97b4ca-a73d-49dc-aa9c-a1960ab5d9c4','3ef8b6a5-5b20-4f13-8001-93f4562d57c0','SPARE_TIRE','Goma de repuesto',0,NULL,'2026-08-05 11:27:57.481','2026-08-05 11:27:57.481'),
('e601914f-4d95-4651-83c4-d5dfca6cc2b7','c3b4437a-0850-4e8c-97ae-ac79aecda524','RADIO','Radio funcionando',0,NULL,'2026-08-05 11:28:42.238','2026-08-05 11:28:42.238'),
('f345a5cc-bceb-427d-8ac7-498987b17d97','c3b4437a-0850-4e8c-97ae-ac79aecda524','KEYS','Llaves entregadas',0,NULL,'2026-08-05 11:28:42.238','2026-08-05 11:28:42.238'),
('f3a1d8b2-6936-4a9b-a961-08f381a9b973','cb1f655b-1159-4b5c-bff3-47cbab11fdc4','KEYS','Llaves entregadas',0,NULL,'2026-08-05 11:33:54.318','2026-08-05 11:33:54.318'),
('f9245e54-4c9e-432c-b861-7f195c7c7892','c3b4437a-0850-4e8c-97ae-ac79aecda524','PERSONAL_ITEMS','Objetos personales verificados',0,NULL,'2026-08-05 11:28:42.238','2026-08-05 11:28:42.238'),
('ff8ea3b6-6f35-40f0-a7e0-0083f2223449','cb1f655b-1159-4b5c-bff3-47cbab11fdc4','RADIO','Radio funcionando',0,NULL,'2026-08-05 11:33:54.318','2026-08-05 11:33:54.318'),
('ff976c65-9285-48d5-9d93-2d434dcf8704','5cde3130-9a5c-48f6-ac87-883418c02efd','AC','Aire acondicionado',0,NULL,'2026-08-05 10:27:41.787','2026-08-05 10:27:41.787');
/*!40000 ALTER TABLE `order_checklist_items` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `order_events`
--

DROP TABLE IF EXISTS `order_events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `order_events` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `order_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` enum('ORDER_CREATED','STATUS_CHANGED','NOTE_ADDED','CHECKLIST_UPDATED','SERVICE_ADDED','EMPLOYEE_CHANGED','PHOTO_ADDED') COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(160) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `metadata` json DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `order_events_order_id_created_at_idx` (`order_id`,`created_at`),
  CONSTRAINT `order_events_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `service_orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `order_events`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `order_events` WRITE;
/*!40000 ALTER TABLE `order_events` DISABLE KEYS */;
INSERT INTO `order_events` VALUES
('235ac91e-d62f-452d-b6a1-723510e282ca','cb1f655b-1159-4b5c-bff3-47cbab11fdc4','ORDER_CREATED','Orden creada','La orden fue creada e inició automáticamente.',NULL,'2026-08-05 11:33:54.318'),
('25d8d066-43cb-471f-9953-04de43bdb787','5cde3130-9a5c-48f6-ac87-883418c02efd','ORDER_CREATED','Orden creada','La orden fue creada e inició automáticamente.',NULL,'2026-08-05 10:27:41.787'),
('25f62fc7-ab12-4d49-ab16-aeeb1407cf0c','cb1f655b-1159-4b5c-bff3-47cbab11fdc4','STATUS_CHANGED','Ticket impreso','Taller: copia 1.',NULL,'2026-08-05 12:48:29.760'),
('2c932ecf-575c-499f-b4ec-73850b9f67ba','5cde3130-9a5c-48f6-ac87-883418c02efd','STATUS_CHANGED','Estado actualizado','Estado cambiado de IN_PROGRESS a SERVICES_COMPLETED.',NULL,'2026-08-05 10:30:18.665'),
('3965db0d-d57f-4a82-8089-d1255f24cf5f','3ef8b6a5-5b20-4f13-8001-93f4562d57c0','STATUS_CHANGED','Estado actualizado','Estado cambiado de WAITING a IN_PROGRESS.',NULL,'2026-08-05 11:27:48.384'),
('3a92c8ab-903a-4966-81f3-7e87b96c32e2','cb1f655b-1159-4b5c-bff3-47cbab11fdc4','STATUS_CHANGED','Ticket impreso','Lavado: copia 1.',NULL,'2026-08-05 12:48:29.760'),
('3ef822ad-56e2-4060-85d7-7bd456777653','cb1f655b-1159-4b5c-bff3-47cbab11fdc4','SERVICE_ADDED','Servicio adicional agregado','Engrase × 1, asignado a Luis Martínez.',NULL,'2026-08-05 12:48:29.571'),
('6304edcc-71ac-491e-bc11-e5d3a89d161d','c3b4437a-0850-4e8c-97ae-ac79aecda524','STATUS_CHANGED','Trabajo iniciado','Estado operativo cambiado a IN_PROGRESS.',NULL,'2026-08-05 11:28:42.238'),
('6b2e838a-841a-4bf3-9cc6-568cc6cf19fe','cb1f655b-1159-4b5c-bff3-47cbab11fdc4','STATUS_CHANGED','Ticket impreso','Lavado: copia 1.',NULL,'2026-08-05 12:48:29.759'),
('7516f4cc-8332-4a04-909f-e8b436945724','5cde3130-9a5c-48f6-ac87-883418c02efd','STATUS_CHANGED','Ticket reimpreso','Taller: copia 1.',NULL,'2026-08-05 11:26:35.675'),
('827abcf6-7d98-4562-be93-5e502ef0265e','5cde3130-9a5c-48f6-ac87-883418c02efd','CHECKLIST_UPDATED','Checklist actualizado','Objetos personales verificados: pendiente.',NULL,'2026-08-05 10:28:53.013'),
('8eca74b5-d7aa-454e-aaf2-cd75ce5b3359','5cde3130-9a5c-48f6-ac87-883418c02efd','CHECKLIST_UPDATED','Checklist actualizado','Objetos personales verificados: completado.',NULL,'2026-08-05 10:28:51.843'),
('c839ad42-6c96-447d-991e-7da2e61ddb22','c3b4437a-0850-4e8c-97ae-ac79aecda524','ORDER_CREATED','Orden creada','La orden fue creada e inició automáticamente.',NULL,'2026-08-05 11:28:42.238'),
('d7d161b7-8be6-45cf-9094-8ae6c10b6dbe','cb1f655b-1159-4b5c-bff3-47cbab11fdc4','STATUS_CHANGED','Trabajo iniciado','Estado operativo cambiado a IN_PROGRESS.',NULL,'2026-08-05 11:33:54.318'),
('e42920e2-47da-4895-a763-708ce603ac24','5cde3130-9a5c-48f6-ac87-883418c02efd','STATUS_CHANGED','Trabajo iniciado','Estado operativo cambiado a IN_PROGRESS.',NULL,'2026-08-05 10:27:41.787'),
('ee9d9601-6b66-4c6c-a657-926ccfbd69c2','5cde3130-9a5c-48f6-ac87-883418c02efd','STATUS_CHANGED','Estado actualizado','Estado cambiado de SERVICES_COMPLETED a READY_FOR_DELIVERY.',NULL,'2026-08-05 10:30:21.981'),
('eeb3b618-c641-4626-9b98-1fc073c64b5b','cb1f655b-1159-4b5c-bff3-47cbab11fdc4','STATUS_CHANGED','Ticket impreso','Taller: copia 1.',NULL,'2026-08-05 12:48:29.760');
/*!40000 ALTER TABLE `order_events` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `order_notes`
--

DROP TABLE IF EXISTS `order_notes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `order_notes` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `order_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `visibility` enum('INTERNAL','CUSTOMER') COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `order_notes_order_id_visibility_created_at_idx` (`order_id`,`visibility`,`created_at`),
  CONSTRAINT `order_notes_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `service_orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `order_notes`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `order_notes` WRITE;
/*!40000 ALTER TABLE `order_notes` DISABLE KEYS */;
/*!40000 ALTER TABLE `order_notes` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `payment_allocations`
--

DROP TABLE IF EXISTS `payment_allocations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `payment_allocations` (
  `payment_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `invoice_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` decimal(14,2) NOT NULL,
  PRIMARY KEY (`payment_id`,`invoice_id`),
  KEY `payment_allocations_invoice_id_fkey` (`invoice_id`),
  CONSTRAINT `payment_allocations_invoice_id_fkey` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `payment_allocations_payment_id_fkey` FOREIGN KEY (`payment_id`) REFERENCES `payments` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payment_allocations`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `payment_allocations` WRITE;
/*!40000 ALTER TABLE `payment_allocations` DISABLE KEYS */;
/*!40000 ALTER TABLE `payment_allocations` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `payment_methods`
--

DROP TABLE IF EXISTS `payment_methods`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `payment_methods` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` enum('CASH','CARD','TRANSFER','CREDIT','OTHER') COLLATE utf8mb4_unicode_ci NOT NULL,
  `active` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `payment_methods_code_key` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payment_methods`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `payment_methods` WRITE;
/*!40000 ALTER TABLE `payment_methods` DISABLE KEYS */;
INSERT INTO `payment_methods` VALUES
('16d05375-3712-4def-8c7c-a4284789d96c','CASH','Efectivo','CASH',1),
('7be667ae-8205-4566-946e-2b9546cc9958','TRANSFER','Transferencia','TRANSFER',1),
('d07214dd-aaf9-44c2-9896-3f9267fcea3c','CREDIT','Crédito','CREDIT',1),
('e473e87c-f7db-45b8-99a5-b9470118549f','CARD','Tarjeta','CARD',1);
/*!40000 ALTER TABLE `payment_methods` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `payments`
--

DROP TABLE IF EXISTS `payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `payments` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `payment_method_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cash_session_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reference` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `amount` decimal(14,2) NOT NULL,
  `received_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `payments_cash_session_id_received_at_idx` (`cash_session_id`,`received_at`),
  KEY `payments_payment_method_id_fkey` (`payment_method_id`),
  CONSTRAINT `payments_cash_session_id_fkey` FOREIGN KEY (`cash_session_id`) REFERENCES `cash_sessions` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `payments_payment_method_id_fkey` FOREIGN KEY (`payment_method_id`) REFERENCES `payment_methods` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payments`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `payments` WRITE;
/*!40000 ALTER TABLE `payments` DISABLE KEYS */;
/*!40000 ALTER TABLE `payments` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `permissions`
--

DROP TABLE IF EXISTS `permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `permissions` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(140) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `permissions_code_key` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `permissions`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `permissions` WRITE;
/*!40000 ALTER TABLE `permissions` DISABLE KEYS */;
/*!40000 ALTER TABLE `permissions` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `points_of_sale`
--

DROP TABLE IF EXISTS `points_of_sale`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `points_of_sale` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `company_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `branch_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `points_of_sale_branch_id_code_key` (`branch_id`,`code`),
  KEY `points_of_sale_company_id_active_idx` (`company_id`,`active`),
  CONSTRAINT `points_of_sale_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `points_of_sale_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `points_of_sale`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `points_of_sale` WRITE;
/*!40000 ALTER TABLE `points_of_sale` DISABLE KEYS */;
INSERT INTO `points_of_sale` VALUES
('c76cc9ce-55e8-4300-9a55-3fffadf953dc','00000000-0000-0000-0000-000000000001','d21ca67b-54fd-4336-a413-f3a0b5436dd5','COFFEE_BAR_POS','Coffee Bar y Tienda','Venta de alimentos, bebidas, lubricantes y artículos.',1,'2026-08-05 12:00:15.378','2026-08-05 13:48:38.030');
/*!40000 ALTER TABLE `points_of_sale` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `pos_account_items`
--

DROP TABLE IF EXISTS `pos_account_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `pos_account_items` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `account_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `product_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity` decimal(12,3) NOT NULL,
  `unit_price` decimal(14,2) NOT NULL,
  `tax_amount` decimal(14,2) NOT NULL,
  `line_total` decimal(14,2) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `pos_account_items_account_id_created_at_idx` (`account_id`,`created_at`),
  KEY `pos_account_items_product_id_fkey` (`product_id`),
  CONSTRAINT `pos_account_items_account_id_fkey` FOREIGN KEY (`account_id`) REFERENCES `pos_accounts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `pos_account_items_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pos_account_items`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `pos_account_items` WRITE;
/*!40000 ALTER TABLE `pos_account_items` DISABLE KEYS */;
INSERT INTO `pos_account_items` VALUES
('09b4b56b-66d5-49b9-bee1-b5866fe18e02','50b47f86-c1a6-492e-98e8-2fa646644c30','b0759d99-b6ca-4880-83a4-ee766fe08d36',2.000,150.00,0.00,300.00,'2026-08-05 21:47:32.588'),
('20e9be77-b036-483d-a9cf-4eb862aa43eb','50b47f86-c1a6-492e-98e8-2fa646644c30','9ceed1d3-6db6-4aa0-8437-efcf941e2049',1.000,120.00,0.00,120.00,'2026-08-05 21:56:29.302'),
('26ad709b-5538-418a-974b-5a2fcc2a73af','7497689e-499f-479a-a48a-da9735cddbbe','9ceed1d3-6db6-4aa0-8437-efcf941e2049',1.000,120.00,0.00,120.00,'2026-08-05 21:46:45.967'),
('602679bd-96dd-434c-8538-322b53dcd68f','7497689e-499f-479a-a48a-da9735cddbbe','ef43846f-5999-43b9-acfd-765572cf8d0a',1.000,250.00,0.00,250.00,'2026-08-05 21:46:45.961'),
('83500dd8-6636-43b7-9205-ace57e808cbb','50b47f86-c1a6-492e-98e8-2fa646644c30','5c8b1e44-68e4-4b75-b790-9a8ce6f9fb8b',2.000,100.00,0.00,200.00,'2026-08-05 21:47:32.591'),
('b94a95cc-8d56-4bf1-981b-9d2f3ef6c1d2','50b47f86-c1a6-492e-98e8-2fa646644c30','b8e6a424-4051-4144-bbeb-fa148d401f74',1.000,180.00,0.00,180.00,'2026-08-05 21:56:29.304'),
('ed020fec-79a4-44b8-8963-6ab791053ca4','7497689e-499f-479a-a48a-da9735cddbbe','5c8b1e44-68e4-4b75-b790-9a8ce6f9fb8b',2.000,100.00,0.00,200.00,'2026-08-05 21:46:45.964'),
('fc280a65-0bf5-4f9d-a868-58c21ac8f83d','7497689e-499f-479a-a48a-da9735cddbbe','b0759d99-b6ca-4880-83a4-ee766fe08d36',1.000,150.00,0.00,150.00,'2026-08-05 21:47:13.661'),
('fcf14a7a-3965-4a1b-a6f0-c28b104c283d','50b47f86-c1a6-492e-98e8-2fa646644c30','ef43846f-5999-43b9-acfd-765572cf8d0a',1.000,250.00,0.00,250.00,'2026-08-05 21:56:29.306');
/*!40000 ALTER TABLE `pos_account_items` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `pos_accounts`
--

DROP TABLE IF EXISTS `pos_accounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `pos_accounts` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `point_of_sale_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cash_register_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `order_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reference` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_alias` varchar(160) COLLATE utf8mb4_unicode_ci NOT NULL,
  `table_reference` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('OPEN','PAID','CANCELLED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'OPEN',
  `subtotal` decimal(14,2) NOT NULL DEFAULT '0.00',
  `tax_amount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `total` decimal(14,2) NOT NULL DEFAULT '0.00',
  `opened_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `closed_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  `paid_at` datetime(3) DEFAULT NULL,
  `payment_method_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payment_reference` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `pos_accounts_reference_key` (`reference`),
  KEY `pos_accounts_point_of_sale_id_status_opened_at_idx` (`point_of_sale_id`,`status`,`opened_at`),
  KEY `pos_accounts_order_id_status_idx` (`order_id`,`status`),
  KEY `pos_accounts_cash_register_id_fkey` (`cash_register_id`),
  KEY `pos_accounts_payment_method_id_fkey` (`payment_method_id`),
  CONSTRAINT `pos_accounts_cash_register_id_fkey` FOREIGN KEY (`cash_register_id`) REFERENCES `cash_registers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `pos_accounts_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `service_orders` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `pos_accounts_payment_method_id_fkey` FOREIGN KEY (`payment_method_id`) REFERENCES `payment_methods` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `pos_accounts_point_of_sale_id_fkey` FOREIGN KEY (`point_of_sale_id`) REFERENCES `points_of_sale` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pos_accounts`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `pos_accounts` WRITE;
/*!40000 ALTER TABLE `pos_accounts` DISABLE KEYS */;
INSERT INTO `pos_accounts` VALUES
('50b47f86-c1a6-492e-98e8-2fa646644c30','c76cc9ce-55e8-4300-9a55-3fffadf953dc','4fc748a3-769f-471a-b036-17ac58cc2490',NULL,'CB-00000001','JUan',NULL,'OPEN',1050.00,0.00,1050.00,'2026-08-05 13:50:03.306',NULL,'2026-08-05 13:50:03.306','2026-08-05 21:56:29.307',NULL,NULL,NULL),
('7497689e-499f-479a-a48a-da9735cddbbe','c76cc9ce-55e8-4300-9a55-3fffadf953dc','4fc748a3-769f-471a-b036-17ac58cc2490',NULL,'CB-1785966405938','ISmael',NULL,'PAID',720.00,0.00,720.00,'2026-08-05 21:46:45.939','2026-08-05 21:47:24.858','2026-08-05 21:46:45.939','2026-08-05 21:47:24.859','2026-08-05 21:47:24.858','16d05375-3712-4def-8c7c-a4284789d96c',NULL);
/*!40000 ALTER TABLE `pos_accounts` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `pos_movement_items`
--

DROP TABLE IF EXISTS `pos_movement_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `pos_movement_items` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `movement_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `product_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity` decimal(12,3) NOT NULL,
  `unit_price` decimal(14,2) NOT NULL,
  `tax_amount` decimal(14,2) NOT NULL,
  `line_total` decimal(14,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `pos_movement_items_movement_id_idx` (`movement_id`),
  KEY `pos_movement_items_product_id_fkey` (`product_id`),
  CONSTRAINT `pos_movement_items_movement_id_fkey` FOREIGN KEY (`movement_id`) REFERENCES `pos_movements` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `pos_movement_items_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pos_movement_items`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `pos_movement_items` WRITE;
/*!40000 ALTER TABLE `pos_movement_items` DISABLE KEYS */;
INSERT INTO `pos_movement_items` VALUES
('210f7725-3db1-453d-baa6-d8b031a30a66','50b479d2-e9b5-4abf-a54d-65d945f8c6c1','ef43846f-5999-43b9-acfd-765572cf8d0a',1.000,250.00,0.00,250.00),
('4522a0ec-e4f5-45b2-b6d7-0c454622942d','50b479d2-e9b5-4abf-a54d-65d945f8c6c1','0124291d-d387-4b14-96ee-28654db98476',1.000,650.00,0.00,650.00),
('63a1a03a-85de-4895-9604-7ceb0f562cf4','5e057d0a-fc18-409d-bd11-64fcc8109313','9ceed1d3-6db6-4aa0-8437-efcf941e2049',1.000,120.00,0.00,120.00),
('dd139017-5745-4b1f-af0f-c47d84aca49e','50b479d2-e9b5-4abf-a54d-65d945f8c6c1','b0759d99-b6ca-4880-83a4-ee766fe08d36',1.000,150.00,0.00,150.00);
/*!40000 ALTER TABLE `pos_movement_items` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `pos_movements`
--

DROP TABLE IF EXISTS `pos_movements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `pos_movements` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `point_of_sale_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `order_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `type` enum('ORDER_ASSOCIATED','DIRECT_SALE') COLLATE utf8mb4_unicode_ci NOT NULL,
  `reference` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_alias` varchar(160) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `subtotal` decimal(14,2) NOT NULL,
  `tax_amount` decimal(14,2) NOT NULL,
  `total` decimal(14,2) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `pos_movements_point_of_sale_id_created_at_idx` (`point_of_sale_id`,`created_at`),
  KEY `pos_movements_order_id_created_at_idx` (`order_id`,`created_at`),
  CONSTRAINT `pos_movements_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `service_orders` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `pos_movements_point_of_sale_id_fkey` FOREIGN KEY (`point_of_sale_id`) REFERENCES `points_of_sale` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pos_movements`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `pos_movements` WRITE;
/*!40000 ALTER TABLE `pos_movements` DISABLE KEYS */;
INSERT INTO `pos_movements` VALUES
('50b479d2-e9b5-4abf-a54d-65d945f8c6c1','c76cc9ce-55e8-4300-9a55-3fffadf953dc',NULL,'DIRECT_SALE','POS-1785932124198',NULL,1050.00,0.00,1050.00,'2026-08-05 12:15:24.199'),
('5e057d0a-fc18-409d-bd11-64fcc8109313','c76cc9ce-55e8-4300-9a55-3fffadf953dc',NULL,'DIRECT_SALE','POS-1785977586448','Terrero',120.00,0.00,120.00,'2026-08-06 00:53:06.449');
/*!40000 ALTER TABLE `pos_movements` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `product_categories`
--

DROP TABLE IF EXISTS `product_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_categories` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `company_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `branch_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sort_order` int NOT NULL DEFAULT '0',
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `product_categories_company_id_code_key` (`company_id`,`code`),
  KEY `product_categories_branch_id_active_idx` (`branch_id`,`active`),
  CONSTRAINT `product_categories_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `product_categories_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product_categories`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `product_categories` WRITE;
/*!40000 ALTER TABLE `product_categories` DISABLE KEYS */;
INSERT INTO `product_categories` VALUES
('26838b36-fdbb-4e60-bcaa-260e4b83653a','00000000-0000-0000-0000-000000000001','d21ca67b-54fd-4336-a413-f3a0b5436dd5','REGALOS','Regalos',5,1,'2026-08-05 12:00:15.395','2026-08-05 13:48:38.046'),
('88538e6f-ebd1-4c11-81a9-d03d80f7febf','00000000-0000-0000-0000-000000000001','d21ca67b-54fd-4336-a413-f3a0b5436dd5','ACCESORIOS','Accesorios',4,1,'2026-08-05 12:00:15.393','2026-08-05 13:48:38.045'),
('a816384a-fc0d-4e85-ada2-0cd1c9863d4c','00000000-0000-0000-0000-000000000001','d21ca67b-54fd-4336-a413-f3a0b5436dd5','BEBIDAS','Bebidas',1,1,'2026-08-05 12:00:15.387','2026-08-05 13:48:38.036'),
('f46fc199-d1fd-4b3d-9eaf-bbfd45ff5efc','00000000-0000-0000-0000-000000000001','d21ca67b-54fd-4336-a413-f3a0b5436dd5','ALIMENTOS','Alimentos',2,1,'2026-08-05 12:00:15.389','2026-08-05 13:48:38.039'),
('f6e952a2-c2a4-43c9-b9b9-365ea833aca6','00000000-0000-0000-0000-000000000001','d21ca67b-54fd-4336-a413-f3a0b5436dd5','LUBRICANTES','Lubricantes',3,1,'2026-08-05 12:00:15.392','2026-08-05 13:48:38.043');
/*!40000 ALTER TABLE `product_categories` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `products`
--

DROP TABLE IF EXISTS `products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `products` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `company_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `branch_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `point_of_sale_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sku` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(160) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `type` enum('PRODUCT','LUBRICANT','PART','ACCESSORY','SUPPLY','FOOD','BEVERAGE','GIFT') COLLATE utf8mb4_unicode_ci NOT NULL,
  `price` decimal(14,2) NOT NULL,
  `tax_rate` decimal(7,4) NOT NULL DEFAULT '0.0000',
  `stock_quantity` decimal(14,3) NOT NULL DEFAULT '0.000',
  `track_inventory` tinyint(1) NOT NULL DEFAULT '1',
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `products_company_id_sku_key` (`company_id`,`sku`),
  KEY `products_branch_id_point_of_sale_id_active_idx` (`branch_id`,`point_of_sale_id`,`active`),
  KEY `products_category_id_active_idx` (`category_id`,`active`),
  KEY `products_point_of_sale_id_fkey` (`point_of_sale_id`),
  CONSTRAINT `products_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `products_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `product_categories` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `products_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `products_point_of_sale_id_fkey` FOREIGN KEY (`point_of_sale_id`) REFERENCES `points_of_sale` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `products`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `products` WRITE;
/*!40000 ALTER TABLE `products` DISABLE KEYS */;
INSERT INTO `products` VALUES
('0124291d-d387-4b14-96ee-28654db98476','00000000-0000-0000-0000-000000000001','d21ca67b-54fd-4336-a413-f3a0b5436dd5','c76cc9ce-55e8-4300-9a55-3fffadf953dc','f6e952a2-c2a4-43c9-b9b9-365ea833aca6','LUB-001','Aceite 5W30',NULL,'LUBRICANT',650.00,0.0000,24.000,1,1,'2026-08-05 12:00:15.403','2026-08-05 13:48:38.054'),
('5c8b1e44-68e4-4b75-b790-9a8ce6f9fb8b','00000000-0000-0000-0000-000000000001','d21ca67b-54fd-4336-a413-f3a0b5436dd5','c76cc9ce-55e8-4300-9a55-3fffadf953dc','a816384a-fc0d-4e85-ada2-0cd1c9863d4c','CAF-001','Café Americano',NULL,'BEVERAGE',100.00,0.0000,76.000,1,1,'2026-08-05 12:00:15.396','2026-08-05 21:55:15.667'),
('9ceed1d3-6db6-4aa0-8437-efcf941e2049','00000000-0000-0000-0000-000000000001','d21ca67b-54fd-4336-a413-f3a0b5436dd5','c76cc9ce-55e8-4300-9a55-3fffadf953dc','f46fc199-d1fd-4b3d-9eaf-bbfd45ff5efc','ALI-001','Empanada',NULL,'FOOD',120.00,0.0000,37.000,1,1,'2026-08-05 12:00:15.401','2026-08-06 00:53:06.453'),
('b0759d99-b6ca-4880-83a4-ee766fe08d36','00000000-0000-0000-0000-000000000001','d21ca67b-54fd-4336-a413-f3a0b5436dd5','c76cc9ce-55e8-4300-9a55-3fffadf953dc','a816384a-fc0d-4e85-ada2-0cd1c9863d4c','CAF-002','Cappuccino',NULL,'BEVERAGE',150.00,0.0000,57.000,1,1,'2026-08-05 12:00:15.399','2026-08-05 21:55:15.672'),
('b8e6a424-4051-4144-bbeb-fa148d401f74','00000000-0000-0000-0000-000000000001','d21ca67b-54fd-4336-a413-f3a0b5436dd5','c76cc9ce-55e8-4300-9a55-3fffadf953dc','26838b36-fdbb-4e60-bcaa-260e4b83653a','GFT-001','Llavero Cactus',NULL,'GIFT',180.00,0.0000,19.000,1,1,'2026-08-05 12:00:15.407','2026-08-05 21:56:29.305'),
('ef43846f-5999-43b9-acfd-765572cf8d0a','00000000-0000-0000-0000-000000000001','d21ca67b-54fd-4336-a413-f3a0b5436dd5','c76cc9ce-55e8-4300-9a55-3fffadf953dc','88538e6f-ebd1-4c11-81a9-d03d80f7febf','ACC-001','Aromatizante',NULL,'ACCESSORY',250.00,0.0000,28.000,1,1,'2026-08-05 12:00:15.405','2026-08-05 21:56:29.307');
/*!40000 ALTER TABLE `products` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `role_permissions`
--

DROP TABLE IF EXISTS `role_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `role_permissions` (
  `role_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `permission_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`role_id`,`permission_id`),
  KEY `role_permissions_permission_id_fkey` (`permission_id`),
  CONSTRAINT `role_permissions_permission_id_fkey` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `role_permissions_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `role_permissions`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `role_permissions` WRITE;
/*!40000 ALTER TABLE `role_permissions` DISABLE KEYS */;
/*!40000 ALTER TABLE `role_permissions` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `roles_code_key` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `service_categories`
--

DROP TABLE IF EXISTS `service_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `service_categories` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `branch_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `company_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `operational_area_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `service_categories_company_id_code_key` (`company_id`,`code`),
  KEY `service_categories_branch_id_active_idx` (`branch_id`,`active`),
  KEY `service_categories_operational_area_id_active_idx` (`operational_area_id`,`active`),
  CONSTRAINT `service_categories_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `service_categories_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `service_categories_operational_area_id_fkey` FOREIGN KEY (`operational_area_id`) REFERENCES `operational_areas` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `service_categories`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `service_categories` WRITE;
/*!40000 ALTER TABLE `service_categories` DISABLE KEYS */;
INSERT INTO `service_categories` VALUES
('47f287b8-3950-4f00-8550-c8135095ede2','WASH','Lavado',1,'d21ca67b-54fd-4336-a413-f3a0b5436dd5','00000000-0000-0000-0000-000000000001','3576f21a-04ae-4bac-8a3f-637c7e326f15'),
('c3f9a038-3d34-4424-a85f-4c29c664951c','WORKSHOP','Taller',1,'d21ca67b-54fd-4336-a413-f3a0b5436dd5','00000000-0000-0000-0000-000000000001','70e6c4c8-4796-441d-bcf6-19e954a83c1e');
/*!40000 ALTER TABLE `service_categories` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `service_order_items`
--

DROP TABLE IF EXISTS `service_order_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `service_order_items` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `service_order_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `item_type` enum('SERVICE','PRODUCT') COLLATE utf8mb4_unicode_ci NOT NULL,
  `service_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `employee_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description_snapshot` varchar(180) COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity` decimal(12,3) NOT NULL DEFAULT '1.000',
  `unit_price` decimal(14,2) NOT NULL,
  `tax_rate` decimal(7,4) NOT NULL DEFAULT '0.0000',
  `tax_amount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `line_total` decimal(14,2) NOT NULL,
  `commission_type` enum('PERCENTAGE','FIXED_AMOUNT','NONE') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `commission_value` decimal(14,4) DEFAULT NULL,
  `commission_amount` decimal(14,2) DEFAULT NULL,
  `status` enum('ACTIVE','COMPLETED','VOIDED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVE',
  `void_reason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `voided_at` datetime(3) DEFAULT NULL,
  `point_of_sale_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `product_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `service_order_items_service_order_id_status_idx` (`service_order_id`,`status`),
  KEY `service_order_items_service_id_fkey` (`service_id`),
  KEY `service_order_items_employee_id_fkey` (`employee_id`),
  KEY `service_order_items_product_id_fkey` (`product_id`),
  KEY `service_order_items_point_of_sale_id_fkey` (`point_of_sale_id`),
  CONSTRAINT `service_order_items_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `service_order_items_point_of_sale_id_fkey` FOREIGN KEY (`point_of_sale_id`) REFERENCES `points_of_sale` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `service_order_items_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `service_order_items_service_id_fkey` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `service_order_items_service_order_id_fkey` FOREIGN KEY (`service_order_id`) REFERENCES `service_orders` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `service_order_items`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `service_order_items` WRITE;
/*!40000 ALTER TABLE `service_order_items` DISABLE KEYS */;
INSERT INTO `service_order_items` VALUES
('1c179558-b989-4175-b091-28e7a9132d97','5cde3130-9a5c-48f6-ac87-883418c02efd','SERVICE','e07c1871-5515-40a4-967a-cfba0ae56b6d','94056e8a-5b05-4422-ab4d-5910f130ee1e','Engrase',1.000,800.00,0.0000,0.00,800.00,NULL,NULL,NULL,'ACTIVE',NULL,'2026-08-05 10:27:41.787',NULL,NULL,NULL),
('1dbf2172-4a82-497d-8082-1382266160d8','757421c1-0527-44e0-a3c0-d32b2fb9dadf','SERVICE','34e1045b-cfaa-4bcf-b944-c48345255270','fdc4ca1b-9e6d-4f37-b59f-60f068e58259','Cambio de aceite',1.000,600.00,0.0000,0.00,600.00,NULL,NULL,NULL,'ACTIVE',NULL,'2026-08-05 03:20:32.393',NULL,NULL,NULL),
('31142fda-13ee-4fa2-a207-e14da890a6e9','32115276-f94e-445a-871e-26328af3584a','SERVICE','34e1045b-cfaa-4bcf-b944-c48345255270','94056e8a-5b05-4422-ab4d-5910f130ee1e','Cambio de aceite',1.000,500.00,0.0000,0.00,500.00,NULL,NULL,NULL,'ACTIVE',NULL,'2026-08-05 08:42:28.038',NULL,NULL,NULL),
('46c1fda9-71bc-483b-9fbe-94b48adb8ea8','be72ddd1-2ecb-4c7b-b2d0-56619460ec63','SERVICE','55cab1f3-ca36-4962-927e-5025bdbf437e','94056e8a-5b05-4422-ab4d-5910f130ee1e','Lavado básico',1.000,300.00,0.0000,0.00,300.00,NULL,NULL,NULL,'ACTIVE',NULL,'2026-08-05 09:51:01.851',NULL,NULL,NULL),
('4ae5991f-f264-4536-a807-2d40d35b7946','1dbb1c12-e958-43d6-8cb4-d3dc1da58a17','SERVICE','34e1045b-cfaa-4bcf-b944-c48345255270','94056e8a-5b05-4422-ab4d-5910f130ee1e','Cambio de aceite',1.000,700.00,0.0000,0.00,700.00,NULL,NULL,NULL,'ACTIVE',NULL,'2026-08-05 09:20:15.505',NULL,NULL,NULL),
('5df2d118-236d-41ea-8628-f334a4305741','cb1f655b-1159-4b5c-bff3-47cbab11fdc4','SERVICE','34e1045b-cfaa-4bcf-b944-c48345255270','94056e8a-5b05-4422-ab4d-5910f130ee1e','Cambio de aceite',1.000,900.00,0.0000,0.00,900.00,NULL,NULL,NULL,'ACTIVE',NULL,'2026-08-05 11:33:54.318',NULL,NULL,NULL),
('5fcb97fc-14bf-452e-845b-b7d595f28683','51d15a13-04ec-4151-bfca-f92654ccdca5','SERVICE','34e1045b-cfaa-4bcf-b944-c48345255270','94056e8a-5b05-4422-ab4d-5910f130ee1e','Cambio de aceite',1.000,600.00,0.0000,0.00,600.00,NULL,NULL,NULL,'ACTIVE',NULL,'2026-08-05 09:46:41.840',NULL,NULL,NULL),
('7adc129a-993b-4139-a949-74c425e68c6d','5cde3130-9a5c-48f6-ac87-883418c02efd','SERVICE','34e1045b-cfaa-4bcf-b944-c48345255270','94056e8a-5b05-4422-ab4d-5910f130ee1e','Cambio de aceite',1.000,900.00,0.0000,0.00,900.00,NULL,NULL,NULL,'ACTIVE',NULL,'2026-08-05 10:27:41.787',NULL,NULL,NULL),
('90fbd891-2dd6-4d9a-9106-8d20da7912d9','3810438c-fd74-4570-b669-056ff7f47832','SERVICE','34e1045b-cfaa-4bcf-b944-c48345255270','94056e8a-5b05-4422-ab4d-5910f130ee1e','Cambio de aceite',1.000,700.00,0.0000,0.00,700.00,NULL,NULL,NULL,'ACTIVE',NULL,'2026-08-04 21:54:35.738',NULL,NULL,NULL),
('b672fad6-5de9-4ad3-81eb-813592bb978c','c3b4437a-0850-4e8c-97ae-ac79aecda524','SERVICE','d1a1c777-6efa-4ee2-be5d-430cdcd6ec48','4122fb04-bc9b-4736-943a-85d51d3e5ad7','Sopleteo',1.000,500.00,0.0000,0.00,500.00,NULL,NULL,NULL,'ACTIVE',NULL,'2026-08-05 11:28:42.238',NULL,NULL,NULL),
('b94f9f3c-f23d-4df3-a4ab-d732e7c9acf8','dac15008-80b1-4c2e-a326-bf061bc626de','SERVICE','34e1045b-cfaa-4bcf-b944-c48345255270','94056e8a-5b05-4422-ab4d-5910f130ee1e','Cambio de aceite',1.000,700.00,0.0000,0.00,700.00,NULL,NULL,NULL,'ACTIVE',NULL,'2026-08-04 21:54:42.357',NULL,NULL,NULL),
('bc93ae28-0fee-45c3-9767-1a54e1aa5ead','32115276-f94e-445a-871e-26328af3584a','SERVICE','e07c1871-5515-40a4-967a-cfba0ae56b6d','94056e8a-5b05-4422-ab4d-5910f130ee1e','Engrase',1.000,400.00,0.0000,0.00,400.00,NULL,NULL,NULL,'ACTIVE',NULL,'2026-08-05 08:42:28.038',NULL,NULL,NULL),
('c437de16-2fda-459a-bb70-e5b7efa157d3','3ef8b6a5-5b20-4f13-8001-93f4562d57c0','SERVICE','55cab1f3-ca36-4962-927e-5025bdbf437e','94056e8a-5b05-4422-ab4d-5910f130ee1e','Lavado básico',1.000,300.00,0.0000,0.00,300.00,NULL,NULL,NULL,'ACTIVE',NULL,'2026-08-05 09:52:41.035',NULL,NULL,NULL),
('de749664-5c9f-4242-8522-2bf3a9b04031','cb1f655b-1159-4b5c-bff3-47cbab11fdc4','SERVICE','5ec6d170-a143-430b-af7d-dde0e54f2bda','94056e8a-5b05-4422-ab4d-5910f130ee1e','Lavado especial',1.000,900.00,0.0000,0.00,900.00,NULL,NULL,NULL,'ACTIVE',NULL,'2026-08-05 11:33:54.318',NULL,NULL,NULL),
('e8b285ce-1f08-442f-a795-ace3d9f1afec','c3b4437a-0850-4e8c-97ae-ac79aecda524','SERVICE','55cab1f3-ca36-4962-927e-5025bdbf437e','94056e8a-5b05-4422-ab4d-5910f130ee1e','Lavado básico',1.000,400.00,0.0000,0.00,400.00,NULL,NULL,NULL,'ACTIVE',NULL,'2026-08-05 11:28:42.238',NULL,NULL,NULL),
('ff4686e4-922d-4a48-b63b-9734c1c3d804','cb1f655b-1159-4b5c-bff3-47cbab11fdc4','SERVICE','e07c1871-5515-40a4-967a-cfba0ae56b6d','fdc4ca1b-9e6d-4f37-b59f-60f068e58259','Engrase',1.000,800.00,0.0000,0.00,800.00,NULL,NULL,NULL,'ACTIVE',NULL,'2026-08-05 12:48:29.562',NULL,NULL,NULL);
/*!40000 ALTER TABLE `service_order_items` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `service_orders`
--

DROP TABLE IF EXISTS `service_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `service_orders` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `branch_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `customer_alias` varchar(160) COLLATE utf8mb4_unicode_ci NOT NULL,
  `vehicle_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `order_number` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `operational_status` enum('RECEIVED','WAITING','IN_PROGRESS','SERVICES_COMPLETED','READY_FOR_DELIVERY','DELIVERED','CANCELLED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'RECEIVED',
  `financial_status` enum('PENDING','PARTIALLY_PAID','PAID','CREDIT','CREDIT_NOTE_APPLIED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `qr_token` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `entry_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `services_completed_at` datetime(3) DEFAULT NULL,
  `paid_at` datetime(3) DEFAULT NULL,
  `delivered_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `service_orders_order_number_key` (`order_number`),
  UNIQUE KEY `service_orders_qr_token_key` (`qr_token`),
  KEY `service_orders_branch_id_operational_status_entry_at_idx` (`branch_id`,`operational_status`,`entry_at`),
  KEY `service_orders_vehicle_id_created_at_idx` (`vehicle_id`,`created_at`),
  KEY `service_orders_customer_id_fkey` (`customer_id`),
  CONSTRAINT `service_orders_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `service_orders_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `service_orders_vehicle_id_fkey` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `service_orders`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `service_orders` WRITE;
/*!40000 ALTER TABLE `service_orders` DISABLE KEYS */;
INSERT INTO `service_orders` VALUES
('1dbb1c12-e958-43d6-8cb4-d3dc1da58a17','d21ca67b-54fd-4336-a413-f3a0b5436dd5',NULL,'sdfsdf','8ab1751d-2a3f-42fd-81b7-446bd6dc8c82','ORD-00000005','IN_PROGRESS','PENDING','617c2c6b-2208-49b1-8b7d-7b5f3059e344',NULL,'2026-08-05 09:20:15.505',NULL,NULL,NULL,'2026-08-05 09:20:15.505','2026-08-05 09:39:26.131'),
('32115276-f94e-445a-871e-26328af3584a','d21ca67b-54fd-4336-a413-f3a0b5436dd5',NULL,'ISmael Santod','d989de6b-b565-4eba-ae76-717b88a904c0','ORD-00000004','WAITING','PENDING','ab3a0bf9-f6fc-4107-a4ed-3e986e5edba5',NULL,'2026-08-05 08:42:28.038',NULL,NULL,NULL,'2026-08-05 08:42:28.038','2026-08-05 08:42:28.038'),
('3810438c-fd74-4570-b669-056ff7f47832','d21ca67b-54fd-4336-a413-f3a0b5436dd5',NULL,'sdfs','4d724e8e-cf50-4f97-8182-45d683fc9e75','ORD-00000001','WAITING','PENDING','a06d5063-95f1-4bcd-b6d2-474d325184cc',NULL,'2026-08-04 21:54:35.738',NULL,NULL,NULL,'2026-08-04 21:54:35.738','2026-08-04 21:54:35.738'),
('3ef8b6a5-5b20-4f13-8001-93f4562d57c0','d21ca67b-54fd-4336-a413-f3a0b5436dd5',NULL,'Maria Cabrera','10cadcca-716d-43b5-b275-600d18d09656','ORD-00000008','IN_PROGRESS','PENDING','99a188ab-a783-45d7-8eee-a2581ff053c5',NULL,'2026-08-05 09:52:41.035',NULL,NULL,NULL,'2026-08-05 09:52:41.035','2026-08-05 11:27:48.384'),
('51d15a13-04ec-4151-bfca-f92654ccdca5','d21ca67b-54fd-4336-a413-f3a0b5436dd5',NULL,'Yudy Garrido','a6988b33-80fe-4155-9d3c-73721c77d561','ORD-00000006','WAITING','PENDING','975b0007-3003-43ba-9a5f-1b70687d9c2a',NULL,'2026-08-05 09:46:41.840',NULL,NULL,NULL,'2026-08-05 09:46:41.840','2026-08-05 09:46:41.840'),
('5cde3130-9a5c-48f6-ac87-883418c02efd','d21ca67b-54fd-4336-a413-f3a0b5436dd5',NULL,'Juan Miguel','cf75d86c-151a-479e-a420-7288bca5feff','ORD-00000009','READY_FOR_DELIVERY','PENDING','d1c273b9-ba27-41db-ac41-3f148673c47a',NULL,'2026-08-05 10:27:41.787','2026-08-05 10:30:18.665',NULL,NULL,'2026-08-05 10:27:41.787','2026-08-05 10:30:21.981'),
('757421c1-0527-44e0-a3c0-d32b2fb9dadf','d21ca67b-54fd-4336-a413-f3a0b5436dd5',NULL,'Ismael Santos','0b167983-a953-4be9-92ba-7bc102497869','ORD-00000003','WAITING','PENDING','4c1564f8-da95-4fb7-9b0c-7f75a5bc0d10',NULL,'2026-08-05 03:20:32.393',NULL,NULL,NULL,'2026-08-05 03:20:32.393','2026-08-05 03:20:32.393'),
('be72ddd1-2ecb-4c7b-b2d0-56619460ec63','d21ca67b-54fd-4336-a413-f3a0b5436dd5',NULL,'Maria Cabrera','098fbd3a-ce4d-4c18-b184-bb3b64bfb0c9','ORD-00000007','WAITING','PENDING','a3335a7f-42be-4201-9d08-0e0e6714c723',NULL,'2026-08-05 09:51:01.851',NULL,NULL,NULL,'2026-08-05 09:51:01.851','2026-08-05 09:51:01.851'),
('c3b4437a-0850-4e8c-97ae-ac79aecda524','d21ca67b-54fd-4336-a413-f3a0b5436dd5',NULL,'Maria Corcini','7fb90eee-e147-4988-8126-7ce7c9e1066b','ORD-00000010','IN_PROGRESS','PENDING','8744497b-9ea6-40dc-a2f2-b1e95cb26686',NULL,'2026-08-05 11:28:42.238',NULL,NULL,NULL,'2026-08-05 11:28:42.238','2026-08-05 11:28:42.238'),
('cb1f655b-1159-4b5c-bff3-47cbab11fdc4','d21ca67b-54fd-4336-a413-f3a0b5436dd5',NULL,'Mendex','ae77f602-bd47-4de4-8383-427ffa03c57f','ORD-00000011','IN_PROGRESS','PENDING','656bcf74-1a83-48c3-abb3-f9093ae341ed',NULL,'2026-08-05 11:33:54.318',NULL,NULL,NULL,'2026-08-05 11:33:54.318','2026-08-05 11:33:54.318'),
('dac15008-80b1-4c2e-a326-bf061bc626de','d21ca67b-54fd-4336-a413-f3a0b5436dd5',NULL,'sdfs','94576c42-84f8-4ea1-a736-8cc75213d69a','ORD-00000002','WAITING','PENDING','2113ac4a-a075-4575-94e8-a84fcbf94817',NULL,'2026-08-04 21:54:42.357',NULL,NULL,NULL,'2026-08-04 21:54:42.357','2026-08-04 21:54:42.357');
/*!40000 ALTER TABLE `service_orders` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `service_prices`
--

DROP TABLE IF EXISTS `service_prices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `service_prices` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `service_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `vehicle_type_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `branch_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `price` decimal(14,2) NOT NULL,
  `taxable` tinyint(1) NOT NULL DEFAULT '0',
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `valid_from` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `valid_to` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `service_prices_service_id_vehicle_type_id_branch_id_active_idx` (`service_id`,`vehicle_type_id`,`branch_id`,`active`),
  KEY `service_prices_vehicle_type_id_fkey` (`vehicle_type_id`),
  KEY `service_prices_branch_id_fkey` (`branch_id`),
  CONSTRAINT `service_prices_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `service_prices_service_id_fkey` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `service_prices_vehicle_type_id_fkey` FOREIGN KEY (`vehicle_type_id`) REFERENCES `vehicle_types` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `service_prices`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `service_prices` WRITE;
/*!40000 ALTER TABLE `service_prices` DISABLE KEYS */;
INSERT INTO `service_prices` VALUES
('00d2e9e7-e9ad-4e31-8842-dd0f31b44087','e07c1871-5515-40a4-967a-cfba0ae56b6d','b680b08e-0234-42f5-8fd2-e8c10042a456','d21ca67b-54fd-4336-a413-f3a0b5436dd5',500.00,0,1,'2026-08-04 04:05:18.611',NULL),
('0dfb4bac-8757-4d39-8219-3caf0a5b8c62','5ec6d170-a143-430b-af7d-dde0e54f2bda','b680b08e-0234-42f5-8fd2-e8c10042a456','d21ca67b-54fd-4336-a413-f3a0b5436dd5',500.00,0,1,'2026-08-04 04:05:18.586',NULL),
('130a1430-14de-49c2-b543-165ddf93d884','55cab1f3-ca36-4962-927e-5025bdbf437e','b680b08e-0234-42f5-8fd2-e8c10042a456','d21ca67b-54fd-4336-a413-f3a0b5436dd5',400.00,0,1,'2026-08-04 04:05:18.570',NULL),
('1b821d2d-8b5d-40ea-a232-969dc218fe87','34e1045b-cfaa-4bcf-b944-c48345255270','b680b08e-0234-42f5-8fd2-e8c10042a456','d21ca67b-54fd-4336-a413-f3a0b5436dd5',600.00,0,1,'2026-08-04 04:05:18.634',NULL),
('1c1b7498-1179-43e8-8877-45411ea7b35f','d1a1c777-6efa-4ee2-be5d-430cdcd6ec48','f44eb899-56e7-45ea-ac97-d1960e7ba54e','d21ca67b-54fd-4336-a413-f3a0b5436dd5',250.00,0,1,'2026-08-04 04:05:18.628',NULL),
('21379fe6-bcd7-4597-8e9f-fada340e3589','d1a1c777-6efa-4ee2-be5d-430cdcd6ec48','b680b08e-0234-42f5-8fd2-e8c10042a456','d21ca67b-54fd-4336-a413-f3a0b5436dd5',500.00,0,1,'2026-08-04 04:05:18.623',NULL),
('242608f0-2fbd-42e1-bc0f-af17a63ee7a0','34e1045b-cfaa-4bcf-b944-c48345255270','38f231af-080b-40a0-a16a-08127cf156a6','d21ca67b-54fd-4336-a413-f3a0b5436dd5',700.00,0,1,'2026-08-04 04:05:18.637',NULL),
('2b7eb1b8-dbd4-4416-a8b1-a2d1c0bcdef7','55cab1f3-ca36-4962-927e-5025bdbf437e','35ea8c90-e73f-48fd-b03b-6cf2226c823c','d21ca67b-54fd-4336-a413-f3a0b5436dd5',400.00,0,1,'2026-08-04 04:05:18.567',NULL),
('30ccb890-0456-45bc-a4a1-e067ea780ec0','34e1045b-cfaa-4bcf-b944-c48345255270','aff3a2e9-0163-4af1-9cee-e82a4b2e012b','d21ca67b-54fd-4336-a413-f3a0b5436dd5',500.00,0,1,'2026-08-04 04:05:18.631',NULL),
('4be6b872-20cc-4328-9574-412da8a17ec2','55cab1f3-ca36-4962-927e-5025bdbf437e','772efd40-6f15-4017-85a6-3904217aea23','d21ca67b-54fd-4336-a413-f3a0b5436dd5',800.00,0,1,'2026-08-04 04:05:18.572',NULL),
('5cf630bc-2474-4242-b048-f91dc952b3be','55cab1f3-ca36-4962-927e-5025bdbf437e','38f231af-080b-40a0-a16a-08127cf156a6','d21ca67b-54fd-4336-a413-f3a0b5436dd5',500.00,0,1,'2026-08-04 04:05:18.574',NULL),
('600d6d72-f384-4306-97ff-3dc68a4b55e6','34e1045b-cfaa-4bcf-b944-c48345255270','f44eb899-56e7-45ea-ac97-d1960e7ba54e','d21ca67b-54fd-4336-a413-f3a0b5436dd5',350.00,0,1,'2026-08-04 04:05:18.639',NULL),
('78899949-06c9-41c4-82a1-35733d9242c9','34e1045b-cfaa-4bcf-b944-c48345255270','772efd40-6f15-4017-85a6-3904217aea23','d21ca67b-54fd-4336-a413-f3a0b5436dd5',900.00,0,1,'2026-08-04 04:05:18.635',NULL),
('79110197-ad75-4565-8b17-f411ff0db8ef','5ec6d170-a143-430b-af7d-dde0e54f2bda','38f231af-080b-40a0-a16a-08127cf156a6','d21ca67b-54fd-4336-a413-f3a0b5436dd5',600.00,0,1,'2026-08-04 04:05:18.590',NULL),
('7961d3d3-0485-44f2-b405-940849859dca','165a7d47-0521-4d24-b2b1-6f7537066d66','aff3a2e9-0163-4af1-9cee-e82a4b2e012b','d21ca67b-54fd-4336-a413-f3a0b5436dd5',400.00,0,1,'2026-08-04 04:05:18.595',NULL),
('819652f6-34e2-4fef-aeab-2fc9645a583e','55cab1f3-ca36-4962-927e-5025bdbf437e','aff3a2e9-0163-4af1-9cee-e82a4b2e012b','d21ca67b-54fd-4336-a413-f3a0b5436dd5',300.00,0,1,'2026-08-04 04:05:18.565',NULL),
('839105a0-d203-4f59-bf14-cb85fdd2321c','e07c1871-5515-40a4-967a-cfba0ae56b6d','aff3a2e9-0163-4af1-9cee-e82a4b2e012b','d21ca67b-54fd-4336-a413-f3a0b5436dd5',400.00,0,1,'2026-08-04 04:05:18.607',NULL),
('8391c05f-b50d-4477-b41c-e4271c563276','5ec6d170-a143-430b-af7d-dde0e54f2bda','f44eb899-56e7-45ea-ac97-d1960e7ba54e','d21ca67b-54fd-4336-a413-f3a0b5436dd5',250.00,0,1,'2026-08-04 04:05:18.592',NULL),
('8e89ec54-e6d3-43eb-aace-2c3c89a94c28','e07c1871-5515-40a4-967a-cfba0ae56b6d','772efd40-6f15-4017-85a6-3904217aea23','d21ca67b-54fd-4336-a413-f3a0b5436dd5',800.00,0,1,'2026-08-04 04:05:18.612',NULL),
('904132a1-9109-44f9-acb2-9f925fdc690e','165a7d47-0521-4d24-b2b1-6f7537066d66','35ea8c90-e73f-48fd-b03b-6cf2226c823c','d21ca67b-54fd-4336-a413-f3a0b5436dd5',500.00,0,1,'2026-08-04 04:05:18.596',NULL),
('98ceb8fb-9d66-4ccd-bcbc-1ef65024a084','d1a1c777-6efa-4ee2-be5d-430cdcd6ec48','38f231af-080b-40a0-a16a-08127cf156a6','d21ca67b-54fd-4336-a413-f3a0b5436dd5',600.00,0,1,'2026-08-04 04:05:18.626',NULL),
('a1e4f70f-7e50-4731-97fb-72574087278e','e07c1871-5515-40a4-967a-cfba0ae56b6d','38f231af-080b-40a0-a16a-08127cf156a6','d21ca67b-54fd-4336-a413-f3a0b5436dd5',600.00,0,1,'2026-08-04 04:05:18.614',NULL),
('a7bbe9af-ea57-4c24-bbc7-b64735779e16','55cab1f3-ca36-4962-927e-5025bdbf437e','f44eb899-56e7-45ea-ac97-d1960e7ba54e','d21ca67b-54fd-4336-a413-f3a0b5436dd5',200.00,0,1,'2026-08-04 04:05:18.577',NULL),
('aa465af7-eb6d-4b98-9c2f-43acd3b311af','165a7d47-0521-4d24-b2b1-6f7537066d66','772efd40-6f15-4017-85a6-3904217aea23','d21ca67b-54fd-4336-a413-f3a0b5436dd5',800.00,0,1,'2026-08-04 04:05:18.600',NULL),
('b10fc811-78a8-4fe1-8bb1-eddb695875bf','d1a1c777-6efa-4ee2-be5d-430cdcd6ec48','aff3a2e9-0163-4af1-9cee-e82a4b2e012b','d21ca67b-54fd-4336-a413-f3a0b5436dd5',400.00,0,1,'2026-08-04 04:05:18.620',NULL),
('b8432849-3033-4496-9b5f-6ab77aa53336','5ec6d170-a143-430b-af7d-dde0e54f2bda','aff3a2e9-0163-4af1-9cee-e82a4b2e012b','d21ca67b-54fd-4336-a413-f3a0b5436dd5',350.00,0,1,'2026-08-04 04:05:18.580',NULL),
('c6c6dd72-3b45-45ff-a8a1-869b238eaa19','165a7d47-0521-4d24-b2b1-6f7537066d66','f44eb899-56e7-45ea-ac97-d1960e7ba54e','d21ca67b-54fd-4336-a413-f3a0b5436dd5',300.00,0,1,'2026-08-04 04:05:18.603',NULL),
('ca3b56c8-d8bc-4c36-97c1-c4b7008baa3c','165a7d47-0521-4d24-b2b1-6f7537066d66','b680b08e-0234-42f5-8fd2-e8c10042a456','d21ca67b-54fd-4336-a413-f3a0b5436dd5',500.00,0,1,'2026-08-04 04:05:18.598',NULL),
('ca56d0c9-037f-4e2e-9292-c6d75f12f31e','e07c1871-5515-40a4-967a-cfba0ae56b6d','35ea8c90-e73f-48fd-b03b-6cf2226c823c','d21ca67b-54fd-4336-a413-f3a0b5436dd5',500.00,0,1,'2026-08-04 04:05:18.609',NULL),
('ced08b6e-5f15-4a9f-9bbb-8fdb66dc8783','5ec6d170-a143-430b-af7d-dde0e54f2bda','35ea8c90-e73f-48fd-b03b-6cf2226c823c','d21ca67b-54fd-4336-a413-f3a0b5436dd5',500.00,0,1,'2026-08-04 04:05:18.585',NULL),
('d76d4944-1cf2-421d-ae87-35f0a4a39b59','e07c1871-5515-40a4-967a-cfba0ae56b6d','f44eb899-56e7-45ea-ac97-d1960e7ba54e','d21ca67b-54fd-4336-a413-f3a0b5436dd5',250.00,0,1,'2026-08-04 04:05:18.616',NULL),
('dd033d98-d2f8-4317-8e01-e95fb12becd0','5ec6d170-a143-430b-af7d-dde0e54f2bda','772efd40-6f15-4017-85a6-3904217aea23','d21ca67b-54fd-4336-a413-f3a0b5436dd5',900.00,0,1,'2026-08-04 04:05:18.588',NULL),
('ddb22c50-68fc-4ed3-8d93-5eab6ea029e0','165a7d47-0521-4d24-b2b1-6f7537066d66','38f231af-080b-40a0-a16a-08127cf156a6','d21ca67b-54fd-4336-a413-f3a0b5436dd5',600.00,0,1,'2026-08-04 04:05:18.602',NULL),
('e3078d2b-cb68-499f-9cc9-dd610160b7f2','d1a1c777-6efa-4ee2-be5d-430cdcd6ec48','772efd40-6f15-4017-85a6-3904217aea23','d21ca67b-54fd-4336-a413-f3a0b5436dd5',800.00,0,1,'2026-08-04 04:05:18.625',NULL),
('ed7dcae8-29cd-4fb0-b4dc-62b0853f0b7f','34e1045b-cfaa-4bcf-b944-c48345255270','35ea8c90-e73f-48fd-b03b-6cf2226c823c','d21ca67b-54fd-4336-a413-f3a0b5436dd5',600.00,0,1,'2026-08-04 04:05:18.633',NULL),
('efefdd23-756a-4632-b04c-c20f3400d987','d1a1c777-6efa-4ee2-be5d-430cdcd6ec48','35ea8c90-e73f-48fd-b03b-6cf2226c823c','d21ca67b-54fd-4336-a413-f3a0b5436dd5',500.00,0,1,'2026-08-04 04:05:18.622',NULL);
/*!40000 ALTER TABLE `service_prices` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `services`
--

DROP TABLE IF EXISTS `services`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `services` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `company_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(140) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `services_company_id_code_key` (`company_id`,`code`),
  KEY `services_company_id_category_id_active_idx` (`company_id`,`category_id`,`active`),
  KEY `services_category_id_fkey` (`category_id`),
  CONSTRAINT `services_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `service_categories` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `services_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `services`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `services` WRITE;
/*!40000 ALTER TABLE `services` DISABLE KEYS */;
INSERT INTO `services` VALUES
('165a7d47-0521-4d24-b2b1-6f7537066d66','00000000-0000-0000-0000-000000000001','c3f9a038-3d34-4424-a85f-4c29c664951c','ENGINE_WASH','Lavado de motor',NULL,1,'2026-08-04 04:05:18.593','2026-08-05 13:48:37.970'),
('34e1045b-cfaa-4bcf-b944-c48345255270','00000000-0000-0000-0000-000000000001','c3f9a038-3d34-4424-a85f-4c29c664951c','OIL_CHANGE','Cambio de aceite',NULL,1,'2026-08-04 04:05:18.629','2026-08-05 13:48:37.993'),
('55cab1f3-ca36-4962-927e-5025bdbf437e','00000000-0000-0000-0000-000000000001','47f287b8-3950-4f00-8550-c8135095ede2','WASH_BASIC','Lavado básico',NULL,1,'2026-08-04 04:05:18.562','2026-08-05 13:48:37.955'),
('5ec6d170-a143-430b-af7d-dde0e54f2bda','00000000-0000-0000-0000-000000000001','47f287b8-3950-4f00-8550-c8135095ede2','WASH_SPECIAL','Lavado especial',NULL,1,'2026-08-04 04:05:18.578','2026-08-05 13:48:37.962'),
('d1a1c777-6efa-4ee2-be5d-430cdcd6ec48','00000000-0000-0000-0000-000000000001','c3f9a038-3d34-4424-a85f-4c29c664951c','BLOWING','Sopleteo',NULL,1,'2026-08-04 04:05:18.617','2026-08-05 13:48:37.986'),
('e07c1871-5515-40a4-967a-cfba0ae56b6d','00000000-0000-0000-0000-000000000001','c3f9a038-3d34-4424-a85f-4c29c664951c','GREASING','Engrase',NULL,1,'2026-08-04 04:05:18.604','2026-08-05 13:48:37.979');
/*!40000 ALTER TABLE `services` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `ticket_print_logs`
--

DROP TABLE IF EXISTS `ticket_print_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ticket_print_logs` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `order_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `operational_area_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ticket_code` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL,
  `print_type` enum('ORIGINAL','REPRINT','ADDITIONAL') COLLATE utf8mb4_unicode_ci NOT NULL,
  `copy_number` int NOT NULL DEFAULT '1',
  `printed_by` varchar(160) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `printed_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `ticket_print_logs_order_id_operational_area_id_printed_at_idx` (`order_id`,`operational_area_id`,`printed_at`),
  KEY `ticket_print_logs_operational_area_id_fkey` (`operational_area_id`),
  CONSTRAINT `ticket_print_logs_operational_area_id_fkey` FOREIGN KEY (`operational_area_id`) REFERENCES `operational_areas` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `ticket_print_logs_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `service_orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ticket_print_logs`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `ticket_print_logs` WRITE;
/*!40000 ALTER TABLE `ticket_print_logs` DISABLE KEYS */;
INSERT INTO `ticket_print_logs` VALUES
('29c07980-c9fe-4cae-9ad0-00a0cc3e4f02','cb1f655b-1159-4b5c-bff3-47cbab11fdc4','3576f21a-04ae-4bac-8a3f-637c7e326f15','ORD-00000011-LAV','ORIGINAL',1,'admin','2026-08-05 12:48:29.757'),
('9e4409f9-cd8c-4307-a804-c8540709a0cb','cb1f655b-1159-4b5c-bff3-47cbab11fdc4','70e6c4c8-4796-441d-bcf6-19e954a83c1e','ORD-00000011-TAL','ORIGINAL',1,'admin','2026-08-05 12:48:29.758'),
('a87b0b9b-a363-4562-a2be-e58fe2faddc1','cb1f655b-1159-4b5c-bff3-47cbab11fdc4','3576f21a-04ae-4bac-8a3f-637c7e326f15','ORD-00000011-LAV','ORIGINAL',1,'admin','2026-08-05 12:48:29.757'),
('a87d239b-519f-42e8-a6df-c43df2d01ca5','cb1f655b-1159-4b5c-bff3-47cbab11fdc4','70e6c4c8-4796-441d-bcf6-19e954a83c1e','ORD-00000011-TAL','ORIGINAL',1,'admin','2026-08-05 12:48:29.757'),
('d4038834-6a8d-4baf-85c5-8292b0cf1051','5cde3130-9a5c-48f6-ac87-883418c02efd','70e6c4c8-4796-441d-bcf6-19e954a83c1e','ORD-00000009-TAL','REPRINT',1,'admin','2026-08-05 11:26:35.665');
/*!40000 ALTER TABLE `ticket_print_logs` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `user_roles`
--

DROP TABLE IF EXISTS `user_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_roles` (
  `user_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`user_id`,`role_id`),
  KEY `user_roles_role_id_fkey` (`role_id`),
  CONSTRAINT `user_roles_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `user_roles_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_roles`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `user_roles` WRITE;
/*!40000 ALTER TABLE `user_roles` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_roles` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `company_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `username` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(180) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `full_name` varchar(160) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('ACTIVE','INACTIVE','LOCKED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVE',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_company_id_username_key` (`company_id`,`username`),
  UNIQUE KEY `users_company_id_email_key` (`company_id`,`email`),
  CONSTRAINT `users_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES
('0f1617f5-2bfd-499e-ab25-eef79b170ca1','00000000-0000-0000-0000-000000000001','cashier-ismael',NULL,'LOCAL_CASHIER_PROFILE','ismael','ACTIVE','2026-08-06 00:32:56.386','2026-08-06 00:32:56.386'),
('5ae00bb2-3c79-4253-9a07-a69a0790e7d3','00000000-0000-0000-0000-000000000001','cashier-isamel-santos',NULL,'LOCAL_CASHIER_PROFILE','Isamel Santos','ACTIVE','2026-08-06 01:00:02.791','2026-08-06 01:00:02.791');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `vehicle_brands`
--

DROP TABLE IF EXISTS `vehicle_brands`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `vehicle_brands` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `vehicle_brands_name_key` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vehicle_brands`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `vehicle_brands` WRITE;
/*!40000 ALTER TABLE `vehicle_brands` DISABLE KEYS */;
/*!40000 ALTER TABLE `vehicle_brands` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `vehicle_models`
--

DROP TABLE IF EXISTS `vehicle_models`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `vehicle_models` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `brand_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `vehicle_models_brand_id_name_key` (`brand_id`,`name`),
  CONSTRAINT `vehicle_models_brand_id_fkey` FOREIGN KEY (`brand_id`) REFERENCES `vehicle_brands` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vehicle_models`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `vehicle_models` WRITE;
/*!40000 ALTER TABLE `vehicle_models` DISABLE KEYS */;
/*!40000 ALTER TABLE `vehicle_models` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `vehicle_types`
--

DROP TABLE IF EXISTS `vehicle_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `vehicle_types` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `active` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `vehicle_types_code_key` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vehicle_types`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `vehicle_types` WRITE;
/*!40000 ALTER TABLE `vehicle_types` DISABLE KEYS */;
INSERT INTO `vehicle_types` VALUES
('35ea8c90-e73f-48fd-b03b-6cf2226c823c','JEEP','Jeep',1),
('38f231af-080b-40a0-a16a-08127cf156a6','MINIBUS','Mini Bus',1),
('772efd40-6f15-4017-85a6-3904217aea23','BUS','Bus',1),
('aff3a2e9-0163-4af1-9cee-e82a4b2e012b','CAR','Carro',1),
('b680b08e-0234-42f5-8fd2-e8c10042a456','PICKUP','Camioneta',1),
('f44eb899-56e7-45ea-ac97-d1960e7ba54e','MOTORCYCLE','Motocicleta',1);
/*!40000 ALTER TABLE `vehicle_types` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `vehicles`
--

DROP TABLE IF EXISTS `vehicles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `vehicles` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `vehicle_type_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `brand_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `model_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `plate` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `color` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` varchar(180) COLLATE utf8mb4_unicode_ci NOT NULL,
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `vehicles_plate_idx` (`plate`),
  KEY `vehicles_customer_id_idx` (`customer_id`),
  KEY `vehicles_vehicle_type_id_fkey` (`vehicle_type_id`),
  KEY `vehicles_brand_id_fkey` (`brand_id`),
  KEY `vehicles_model_id_fkey` (`model_id`),
  CONSTRAINT `vehicles_brand_id_fkey` FOREIGN KEY (`brand_id`) REFERENCES `vehicle_brands` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `vehicles_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `vehicles_model_id_fkey` FOREIGN KEY (`model_id`) REFERENCES `vehicle_models` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `vehicles_vehicle_type_id_fkey` FOREIGN KEY (`vehicle_type_id`) REFERENCES `vehicle_types` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vehicles`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `vehicles` WRITE;
/*!40000 ALTER TABLE `vehicles` DISABLE KEYS */;
INSERT INTO `vehicles` VALUES
('098fbd3a-ce4d-4c18-b184-bb3b64bfb0c9',NULL,'aff3a2e9-0163-4af1-9cee-e82a4b2e012b',NULL,NULL,NULL,NULL,'Corolla Marillo',1,'2026-08-05 09:51:01.849','2026-08-05 09:51:01.849'),
('0b167983-a953-4be9-92ba-7bc102497869',NULL,'b680b08e-0234-42f5-8fd2-e8c10042a456',NULL,NULL,NULL,NULL,'sdsdfs',1,'2026-08-05 03:20:32.387','2026-08-05 03:20:32.387'),
('10cadcca-716d-43b5-b275-600d18d09656',NULL,'aff3a2e9-0163-4af1-9cee-e82a4b2e012b',NULL,NULL,NULL,NULL,'Corolla Marillo',1,'2026-08-05 09:52:41.034','2026-08-05 09:52:41.034'),
('4d724e8e-cf50-4f97-8182-45d683fc9e75',NULL,'38f231af-080b-40a0-a16a-08127cf156a6',NULL,NULL,NULL,NULL,'dfsdf',1,'2026-08-04 21:54:35.731','2026-08-04 21:54:35.731'),
('7fb90eee-e147-4988-8126-7ce7c9e1066b',NULL,'35ea8c90-e73f-48fd-b03b-6cf2226c823c',NULL,NULL,NULL,NULL,'PEEMMMDL',1,'2026-08-05 11:28:42.235','2026-08-05 11:28:42.235'),
('8ab1751d-2a3f-42fd-81b7-446bd6dc8c82',NULL,'38f231af-080b-40a0-a16a-08127cf156a6',NULL,NULL,NULL,NULL,'sdfsdf',1,'2026-08-05 09:20:15.502','2026-08-05 09:20:15.502'),
('94576c42-84f8-4ea1-a736-8cc75213d69a',NULL,'38f231af-080b-40a0-a16a-08127cf156a6',NULL,NULL,NULL,NULL,'dfsdf',1,'2026-08-04 21:54:42.355','2026-08-04 21:54:42.355'),
('a6988b33-80fe-4155-9d3c-73721c77d561',NULL,'35ea8c90-e73f-48fd-b03b-6cf2226c823c',NULL,NULL,NULL,NULL,'Nissan Rojo',1,'2026-08-05 09:46:41.837','2026-08-05 09:46:41.837'),
('ae77f602-bd47-4de4-8383-427ffa03c57f',NULL,'772efd40-6f15-4017-85a6-3904217aea23',NULL,NULL,NULL,NULL,'ToYO',1,'2026-08-05 11:33:54.316','2026-08-05 11:33:54.316'),
('cf75d86c-151a-479e-a420-7288bca5feff',NULL,'772efd40-6f15-4017-85a6-3904217aea23',NULL,NULL,NULL,NULL,'MMotodlsm',1,'2026-08-05 10:27:41.784','2026-08-05 10:27:41.784'),
('d989de6b-b565-4eba-ae76-717b88a904c0',NULL,'aff3a2e9-0163-4af1-9cee-e82a4b2e012b',NULL,NULL,NULL,NULL,'Carold daf',1,'2026-08-05 08:42:28.036','2026-08-05 08:42:28.036');
/*!40000 ALTER TABLE `vehicles` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Dumping routines for database 'cactus_carwash'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*M!100616 SET NOTE_VERBOSITY=@OLD_NOTE_VERBOSITY */;

-- Dump completed on 2026-08-05 21:55:50
