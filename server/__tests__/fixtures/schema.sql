
/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
DROP TABLE IF EXISTS `access_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `access_requests` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `full_name` varchar(160) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(190) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `company_name` varchar(180) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('new','contacted','approved','rejected') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'new',
  `consent_at` datetime NOT NULL,
  `ip_address` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_access_requests_status_created` (`status`,`created_at`),
  KEY `idx_access_requests_phone` (`phone`),
  KEY `idx_access_requests_email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `act_attachments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `act_attachments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `act_id` int NOT NULL,
  `file_url` varchar(500) NOT NULL,
  `original_name` varchar(255) DEFAULT NULL,
  `mime_type` varchar(100) DEFAULT NULL,
  `size_bytes` bigint DEFAULT '0',
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_act` (`act_id`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `acts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `acts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `office_id` int NOT NULL,
  `contract_id` int NOT NULL,
  `act_date` date NOT NULL,
  `amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `type` varchar(20) NOT NULL DEFAULT 'docs',
  `responsible_id` int DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'draft',
  `description` text,
  `created_by` int DEFAULT NULL,
  `confirmed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_acts_office` (`office_id`),
  KEY `idx_acts_contract` (`contract_id`),
  KEY `idx_acts_responsible` (`responsible_id`),
  KEY `idx_acts_date` (`act_date`),
  KEY `idx_acts_status` (`status`),
  KEY `idx_acts_type` (`type`),
  KEY `fk_acts_user` (`created_by`),
  CONSTRAINT `fk_acts_contract` FOREIGN KEY (`contract_id`) REFERENCES `contracts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_acts_employee` FOREIGN KEY (`responsible_id`) REFERENCES `employees` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_acts_office` FOREIGN KEY (`office_id`) REFERENCES `offices` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_acts_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=113 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `additional_tz`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `additional_tz` (
  `id` int NOT NULL AUTO_INCREMENT,
  `office_id` int NOT NULL,
  `case_id` int NOT NULL,
  `document_type` varchar(255) DEFAULT NULL,
  `description` text,
  `purpose` varchar(500) DEFAULT NULL,
  `expert_id` int DEFAULT NULL,
  `manager_id` int DEFAULT NULL,
  `deadline_days` int DEFAULT NULL,
  `deadline_date` date DEFAULT NULL,
  `status` enum('created','with_manager','assigned_to_expert','in_progress','done','closed') NOT NULL DEFAULT 'with_manager',
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_atz_office` (`office_id`),
  KEY `idx_atz_case` (`case_id`),
  KEY `idx_atz_expert` (`expert_id`,`status`),
  CONSTRAINT `additional_tz_ibfk_1` FOREIGN KEY (`office_id`) REFERENCES `offices` (`id`) ON DELETE CASCADE,
  CONSTRAINT `additional_tz_ibfk_2` FOREIGN KEY (`case_id`) REFERENCES `cases` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `appointment_lawyer_id_backup_20260816`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `appointment_lawyer_id_backup_20260816` (
  `appointment_id` int NOT NULL,
  `old_assigned_lawyer_id` int DEFAULT NULL,
  `new_user_id` int DEFAULT NULL,
  `backed_up_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`appointment_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `appointment_sources`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `appointment_sources` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_by` int DEFAULT NULL,
  `archived_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_appointment_sources_name` (`name`),
  KEY `idx_appointment_sources_active` (`is_active`),
  KEY `fk_appointment_sources_created_by` (`created_by`),
  CONSTRAINT `fk_appointment_sources_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=37 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `appointments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `appointments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `office_id` int NOT NULL,
  `lead_id` int DEFAULT NULL,
  `client_id` int DEFAULT NULL,
  `client_name` varchar(255) NOT NULL,
  `client_phone` varchar(50) NOT NULL,
  `source` varchar(100) DEFAULT NULL,
  `source_id` int DEFAULT NULL,
  `appointment_date` date NOT NULL,
  `appointment_time` time NOT NULL,
  `comment` text,
  `operator_id` int NOT NULL,
  `operator_name` varchar(255) DEFAULT NULL,
  `status` enum('waiting','confirmed','arrived','no_show','cancelled','rescheduled') NOT NULL DEFAULT 'waiting',
  `arrived_at` datetime DEFAULT NULL,
  `consultation_result` enum('contract_signed','not_signed') DEFAULT NULL,
  `contract_signed_by` int DEFAULT NULL,
  `manager_comment` text,
  `is_technical` tinyint(1) NOT NULL DEFAULT '0',
  `assigned_lawyer_id` int DEFAULT NULL,
  `assigned_lawyer_id_2` int DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_appointments_lead` (`lead_id`),
  KEY `idx_appointments_office` (`office_id`),
  KEY `idx_appointments_lead` (`lead_id`),
  KEY `idx_appointments_status` (`status`),
  KEY `idx_appointments_date` (`appointment_date`),
  KEY `idx_appointments_office_technical_date` (`office_id`,`is_technical`,`appointment_date`)
) ENGINE=InnoDB AUTO_INCREMENT=921 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `arrivals`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `arrivals` (
  `id` int NOT NULL AUTO_INCREMENT,
  `office_id` int NOT NULL,
  `source` varchar(100) DEFAULT 'Оплата по договору',
  `amount` decimal(15,2) NOT NULL DEFAULT '0.00',
  `title` varchar(255) NOT NULL,
  `description` text,
  `contract_id` int DEFAULT NULL,
  `client_id` int DEFAULT NULL,
  `received_on` date NOT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_office` (`office_id`),
  KEY `idx_date` (`received_on`),
  KEY `contract_id` (`contract_id`),
  KEY `client_id` (`client_id`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `arrivals_ibfk_1` FOREIGN KEY (`office_id`) REFERENCES `offices` (`id`) ON DELETE CASCADE,
  CONSTRAINT `arrivals_ibfk_2` FOREIGN KEY (`contract_id`) REFERENCES `contracts` (`id`) ON DELETE SET NULL,
  CONSTRAINT `arrivals_ibfk_3` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE SET NULL,
  CONSTRAINT `arrivals_ibfk_4` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `calendar_events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `calendar_events` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `description` text,
  `start_date` date NOT NULL,
  `end_date` date DEFAULT NULL,
  `time` time DEFAULT '10:00:00',
  `type` varchar(50) DEFAULT 'other',
  `priority` varchar(20) DEFAULT 'medium',
  `location` varchar(255) DEFAULT NULL,
  `participants` text,
  `office_id` int DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `office_id` (`office_id`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `calendar_events_ibfk_1` FOREIGN KEY (`office_id`) REFERENCES `offices` (`id`) ON DELETE CASCADE,
  CONSTRAINT `calendar_events_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=171 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `call_center_calls`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `call_center_calls` (
  `id` int NOT NULL AUTO_INCREMENT,
  `lead_id` int NOT NULL,
  `user_id` int DEFAULT NULL,
  `result` varchar(50) NOT NULL,
  `comment` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `idx_call_center_calls_lead` (`lead_id`),
  CONSTRAINT `call_center_calls_ibfk_1` FOREIGN KEY (`lead_id`) REFERENCES `call_center_leads` (`id`) ON DELETE CASCADE,
  CONSTRAINT `call_center_calls_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=106 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `call_center_code_rotations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `call_center_code_rotations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `call_center_id` bigint unsigned NOT NULL,
  `rotated_by` int DEFAULT NULL,
  `rotated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_cc_code_rotations` (`call_center_id`,`rotated_at`),
  KEY `fk_cc_rotations_actor` (`rotated_by`),
  CONSTRAINT `fk_cc_rotations_actor` FOREIGN KEY (`rotated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_cc_rotations_center` FOREIGN KEY (`call_center_id`) REFERENCES `call_centers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `call_center_connection_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `call_center_connection_history` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `office_id` int DEFAULT NULL,
  `call_center_id` bigint unsigned NOT NULL,
  `action` varchar(32) NOT NULL,
  `actor_user_id` int DEFAULT NULL,
  `details` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_cc_history_center` (`call_center_id`,`created_at`),
  KEY `idx_cc_history_office` (`office_id`,`created_at`),
  KEY `fk_cc_history_actor` (`actor_user_id`),
  CONSTRAINT `fk_cc_history_actor` FOREIGN KEY (`actor_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_cc_history_center` FOREIGN KEY (`call_center_id`) REFERENCES `call_centers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cc_history_office` FOREIGN KEY (`office_id`) REFERENCES `offices` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `call_center_connection_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `call_center_connection_requests` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `office_id` int NOT NULL,
  `call_center_id` bigint unsigned NOT NULL,
  `requested_by` int NOT NULL,
  `status` varchar(24) NOT NULL DEFAULT 'pending',
  `responded_by` int DEFAULT NULL,
  `responded_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_cc_requests_center_status` (`call_center_id`,`status`),
  KEY `idx_cc_requests_office_status` (`office_id`,`status`),
  KEY `fk_cc_requests_requester` (`requested_by`),
  KEY `fk_cc_requests_responder` (`responded_by`),
  CONSTRAINT `fk_cc_requests_center` FOREIGN KEY (`call_center_id`) REFERENCES `call_centers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cc_requests_office` FOREIGN KEY (`office_id`) REFERENCES `offices` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cc_requests_requester` FOREIGN KEY (`requested_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_cc_requests_responder` FOREIGN KEY (`responded_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `call_center_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `call_center_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `lead_id` int NOT NULL,
  `action` varchar(100) NOT NULL,
  `user_id` int DEFAULT NULL,
  `details` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `idx_call_center_history_lead` (`lead_id`),
  CONSTRAINT `call_center_history_ibfk_1` FOREIGN KEY (`lead_id`) REFERENCES `call_center_leads` (`id`) ON DELETE CASCADE,
  CONSTRAINT `call_center_history_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=4320 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `call_center_leads`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `call_center_leads` (
  `id` int NOT NULL AUTO_INCREMENT,
  `office_id` int NOT NULL,
  `source` varchar(100) NOT NULL,
  `source_id` int DEFAULT NULL,
  `external_id` varchar(255) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `description` text,
  `status` varchar(50) NOT NULL DEFAULT 'NEW',
  `score` int NOT NULL DEFAULT '0',
  `temperature` varchar(10) DEFAULT NULL,
  `quality_label` varchar(50) DEFAULT NULL,
  `assigned_to` int DEFAULT NULL,
  `duplicate_of_lead_id` int DEFAULT NULL,
  `first_call_at` datetime DEFAULT NULL,
  `last_call_at` datetime DEFAULT NULL,
  `next_call_at` datetime DEFAULT NULL,
  `metadata` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `operator_note` text,
  PRIMARY KEY (`id`),
  KEY `duplicate_of_lead_id` (`duplicate_of_lead_id`),
  KEY `idx_call_center_leads_office_status` (`office_id`,`status`),
  KEY `idx_call_center_leads_assigned_to` (`assigned_to`),
  KEY `idx_call_center_leads_source_external` (`source`,`external_id`),
  KEY `idx_call_center_leads_source` (`source`),
  KEY `idx_call_center_leads_temperature` (`temperature`),
  KEY `idx_call_center_leads_assigned_status` (`assigned_to`,`status`),
  KEY `idx_call_center_leads_created_at` (`created_at`),
  UNIQUE KEY `uq_call_center_lead_external` (`office_id`,`source`,`external_id`),
  CONSTRAINT `call_center_leads_ibfk_1` FOREIGN KEY (`office_id`) REFERENCES `offices` (`id`) ON DELETE CASCADE,
  CONSTRAINT `call_center_leads_ibfk_2` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `call_center_leads_ibfk_3` FOREIGN KEY (`duplicate_of_lead_id`) REFERENCES `call_center_leads` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=1788 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `call_center_members`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `call_center_members` (
  `call_center_id` bigint unsigned NOT NULL,
  `user_id` int NOT NULL,
  `member_role` varchar(32) NOT NULL DEFAULT 'operator',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`call_center_id`,`user_id`),
  UNIQUE KEY `uq_call_center_member_user` (`user_id`),
  CONSTRAINT `fk_cc_members_center` FOREIGN KEY (`call_center_id`) REFERENCES `call_centers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cc_members_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `call_center_operator_status`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `call_center_operator_status` (
  `user_id` int NOT NULL,
  `office_id` int NOT NULL,
  `is_online` tinyint(1) NOT NULL DEFAULT '0',
  `current_load` int NOT NULL DEFAULT '0',
  `last_seen_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_assigned_at` datetime DEFAULT NULL,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  KEY `idx_call_center_operator_status_office` (`office_id`,`is_online`),
  CONSTRAINT `call_center_operator_status_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `call_center_operator_status_ibfk_2` FOREIGN KEY (`office_id`) REFERENCES `offices` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `call_centers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `call_centers` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `public_id` varchar(32) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `owner_user_id` int NOT NULL,
  `connection_code` varchar(64) NOT NULL,
  `code_rotated_at` datetime DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_call_centers_connection_code` (`connection_code`),
  UNIQUE KEY `uq_call_centers_public_id` (`public_id`),
  KEY `idx_call_centers_owner` (`owner_user_id`),
  CONSTRAINT `fk_call_centers_owner` FOREIGN KEY (`owner_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `case_actions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `case_actions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `contract_id` int NOT NULL,
  `user_id` int NOT NULL,
  `action_type` varchar(100) NOT NULL,
  `description` text,
  `action_date` date NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_case_actions_contract` (`contract_id`),
  KEY `idx_case_actions_user` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `cases`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cases` (
  `id` int NOT NULL AUTO_INCREMENT,
  `office_id` int NOT NULL,
  `client_id` int DEFAULT NULL,
  `employee_id` int DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `case_number` varchar(100) DEFAULT NULL,
  `category` varchar(100) DEFAULT NULL,
  `status` enum('new','in_progress','waiting','won','lost','closed') DEFAULT 'new',
  `priority` enum('low','medium','high','urgent') DEFAULT 'medium',
  `description` text,
  `start_date` date DEFAULT NULL,
  `deadline` date DEFAULT NULL,
  `closed_at` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `contract_id` int DEFAULT NULL,
  `manager_id` int DEFAULT NULL,
  `expert_id` int DEFAULT NULL,
  `workflow_status` enum('with_manager','assigned_to_expert','in_progress','done','closed') NOT NULL DEFAULT 'with_manager',
  PRIMARY KEY (`id`),
  KEY `idx_office` (`office_id`),
  KEY `idx_client` (`client_id`),
  KEY `idx_employee` (`employee_id`),
  KEY `idx_status` (`status`),
  KEY `idx_cases_workflow` (`office_id`,`workflow_status`),
  KEY `idx_cases_contract` (`contract_id`),
  KEY `idx_cases_expert` (`expert_id`,`workflow_status`),
  CONSTRAINT `cases_ibfk_1` FOREIGN KEY (`office_id`) REFERENCES `offices` (`id`) ON DELETE CASCADE,
  CONSTRAINT `cases_ibfk_2` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE SET NULL,
  CONSTRAINT `cases_ibfk_3` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `cash_register`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cash_register` (
  `id` int NOT NULL AUTO_INCREMENT,
  `office_id` int NOT NULL,
  `contract_id` int DEFAULT NULL,
  `entry_date` date NOT NULL,
  `client_name` varchar(500) DEFAULT NULL,
  `contract_number` varchar(50) DEFAULT NULL,
  `action` varchar(255) DEFAULT NULL,
  `lawyer_name` varchar(255) DEFAULT NULL,
  `employee_id` int DEFAULT NULL,
  `cash_amount` decimal(15,2) DEFAULT '0.00',
  `noncash_amount` decimal(15,2) DEFAULT '0.00',
  `bank_amount` decimal(15,2) DEFAULT '0.00',
  `expense_amount` decimal(15,2) DEFAULT '0.00',
  `comment` text,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_cash_office_date` (`office_id`,`entry_date`),
  KEY `idx_cash_register_contract_id` (`contract_id`)
) ENGINE=InnoDB AUTO_INCREMENT=290 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `chat_channel_members`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chat_channel_members` (
  `id` int NOT NULL AUTO_INCREMENT,
  `office_id` int NOT NULL,
  `channel` varchar(40) NOT NULL,
  `user_id` int NOT NULL,
  `added_by` int DEFAULT NULL,
  `source` varchar(24) NOT NULL DEFAULT 'manual',
  `call_center_id` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_member` (`office_id`,`channel`,`user_id`),
  KEY `idx_office_channel` (`office_id`,`channel`)
) ENGINE=InnoDB AUTO_INCREMENT=124 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `chat_channels`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chat_channels` (
  `id` int NOT NULL AUTO_INCREMENT,
  `office_id` int NOT NULL,
  `channel` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `created_by` int DEFAULT NULL,
  `is_system` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `archived_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_chat_channel` (`office_id`,`channel`),
  KEY `idx_chat_channels_office` (`office_id`,`archived_at`),
  KEY `fk_chat_channels_creator` (`created_by`),
  CONSTRAINT `fk_chat_channels_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_chat_channels_office` FOREIGN KEY (`office_id`) REFERENCES `offices` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=66 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `chat_message_reads`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chat_message_reads` (
  `message_id` int NOT NULL,
  `user_id` int NOT NULL,
  `read_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`message_id`,`user_id`),
  KEY `idx_chat_reads_user` (`user_id`,`message_id`),
  CONSTRAINT `fk_chat_reads_message` FOREIGN KEY (`message_id`) REFERENCES `messages` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_chat_reads_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `chat_user_presence`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chat_user_presence` (
  `user_id` int NOT NULL,
  `last_seen_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  CONSTRAINT `fk_chat_presence_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `client_phones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `client_phones` (
  `id` int NOT NULL AUTO_INCREMENT,
  `client_id` int NOT NULL,
  `phone` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `label` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_primary` tinyint(1) NOT NULL DEFAULT '0',
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_client_phone` (`client_id`,`phone`),
  KEY `idx_client_phones_client` (`client_id`),
  CONSTRAINT `fk_client_phones_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=129 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `clients`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `clients` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `address` text,
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `office_id` int DEFAULT NULL,
  `company` varchar(255) DEFAULT NULL,
  `status` varchar(50) DEFAULT 'active',
  `first_name` varchar(128) DEFAULT NULL,
  `last_name` varchar(128) DEFAULT NULL,
  `middle_name` varchar(128) DEFAULT NULL,
  `birth_date` date DEFAULT NULL,
  `acting_for` varchar(255) DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `deleted_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_clients_office` (`office_id`)
) ENGINE=InnoDB AUTO_INCREMENT=452 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `consultation_analysis`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `consultation_analysis` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `consultation_id` int NOT NULL,
  `office_id` int NOT NULL,
  `employee_id` int DEFAULT NULL,
  `source_id` int DEFAULT NULL,
  `topic` varchar(255) DEFAULT NULL,
  `lead_quality` enum('HIGH','MEDIUM','LOW','ECONOMICALLY_UNVIABLE','NOT_LEGALLY_SOLVABLE','UNKNOWN') NOT NULL,
  `commercial_potential` enum('HIGH','MEDIUM','LOW','NONE','UNKNOWN') NOT NULL DEFAULT 'UNKNOWN',
  `service_fit` enum('YES','PARTIAL','NO','UNKNOWN') NOT NULL DEFAULT 'UNKNOWN',
  `legally_solvable` enum('YES','PARTIAL','NO','UNKNOWN') NOT NULL DEFAULT 'UNKNOWN',
  `need_identified` enum('YES','PARTIAL','NO','UNKNOWN') NOT NULL DEFAULT 'UNKNOWN',
  `decision_maker_identified` enum('YES','NO','NA','UNKNOWN') NOT NULL DEFAULT 'UNKNOWN',
  `solution_understood` enum('YES','PARTIAL','NO','UNKNOWN') NOT NULL DEFAULT 'UNKNOWN',
  `offer_made` enum('YES','NO','UNKNOWN') NOT NULL DEFAULT 'UNKNOWN',
  `objection_identified` enum('YES','NO','NONE','UNKNOWN') NOT NULL DEFAULT 'UNKNOWN',
  `objection_processed` enum('YES','PARTIAL','NO','NONE','UNKNOWN') NOT NULL DEFAULT 'UNKNOWN',
  `client_objection` text,
  `proposed_service` varchar(255) DEFAULT NULL,
  `proposed_price` decimal(15,2) DEFAULT NULL,
  `next_step` enum('FOLLOW_UP','PROPOSAL_SENT','CLIENT_DECLINED','NOT_FIXED') NOT NULL DEFAULT 'NOT_FIXED',
  `loss_category` enum('LEAD_QUALITY','SALES_PROCESS','CLIENT_DELAY','SERVICE_PROBLEM','NON_TARGET','UNRESOLVED','OTHER') NOT NULL,
  `loss_reason` varchar(80) NOT NULL,
  `manager_comment` text,
  `evidence_sources` json NOT NULL,
  `data_sufficiency` enum('SUFFICIENT','PARTIAL','INSUFFICIENT') NOT NULL,
  `missing_data_reason` varchar(255) DEFAULT NULL,
  `classification_basis` enum('FACTS','MIXED','HYPOTHESIS') NOT NULL DEFAULT 'MIXED',
  `confidence_score` tinyint unsigned NOT NULL DEFAULT '0',
  `analysis_status` enum('DRAFT','QUEUED','PROCESSING','READY_FOR_REVIEW','CONFIRMED','CORRECTED','FAILED','STALE') NOT NULL DEFAULT 'DRAFT',
  `ai_category` varchar(50) DEFAULT NULL,
  `ai_confidence` decimal(5,2) DEFAULT NULL,
  `probable_reason` varchar(500) DEFAULT NULL,
  `probable_need` varchar(500) DEFAULT NULL,
  `ai_summary` text,
  `ai_evidence` json DEFAULT NULL,
  `ai_contradictions` json DEFAULT NULL,
  `ai_missing_data` json DEFAULT NULL,
  `model_version` varchar(100) DEFAULT NULL,
  `prompt_version` varchar(50) DEFAULT NULL,
  `input_hash` char(64) DEFAULT NULL,
  `confirmed_by` int DEFAULT NULL,
  `confirmed_at` datetime DEFAULT NULL,
  `ai_analysis` json DEFAULT NULL,
  `created_by` int NOT NULL,
  `updated_by` int NOT NULL,
  `version` int NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  `deleted_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_consultation_analysis` (`consultation_id`),
  KEY `idx_ca_office_created` (`office_id`,`created_at`),
  KEY `idx_ca_employee_created` (`employee_id`,`created_at`),
  KEY `idx_ca_source_created` (`source_id`,`created_at`),
  KEY `idx_ca_category_created` (`loss_category`,`created_at`),
  KEY `fk_ca_created_by` (`created_by`),
  KEY `fk_ca_updated_by` (`updated_by`),
  CONSTRAINT `fk_ca_consultation` FOREIGN KEY (`consultation_id`) REFERENCES `appointments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ca_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_ca_employee` FOREIGN KEY (`employee_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_ca_office` FOREIGN KEY (`office_id`) REFERENCES `offices` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ca_source` FOREIGN KEY (`source_id`) REFERENCES `appointment_sources` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_ca_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `consultation_analysis_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `consultation_analysis_history` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `analysis_id` bigint unsigned NOT NULL,
  `consultation_id` int NOT NULL,
  `office_id` int NOT NULL,
  `version` int NOT NULL,
  `action` enum('CREATE','UPDATE','DELETE') NOT NULL,
  `old_values` json DEFAULT NULL,
  `new_values` json DEFAULT NULL,
  `changed_by` int NOT NULL,
  `changed_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_cah_analysis` (`analysis_id`,`version`),
  KEY `idx_cah_office_date` (`office_id`,`changed_at`),
  KEY `fk_cah_changed_by` (`changed_by`),
  CONSTRAINT `fk_cah_analysis` FOREIGN KEY (`analysis_id`) REFERENCES `consultation_analysis` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cah_changed_by` FOREIGN KEY (`changed_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `consultation_analysis_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `consultation_analysis_settings` (
  `office_id` int NOT NULL,
  `min_sample_size` int NOT NULL DEFAULT '20',
  `coverage_warning_pct` decimal(5,2) NOT NULL DEFAULT '70.00',
  `revenue_method` enum('TOPIC_AVG','OFFICE_AVG') NOT NULL DEFAULT 'TOPIC_AVG',
  `updated_by` int DEFAULT NULL,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `analysis_enabled` tinyint(1) NOT NULL DEFAULT '1',
  `ai_enabled` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`office_id`),
  CONSTRAINT `fk_cas_office` FOREIGN KEY (`office_id`) REFERENCES `offices` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `consultation_analysis_versions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `consultation_analysis_versions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `analysis_id` bigint unsigned NOT NULL,
  `version` int NOT NULL,
  `input_snapshot` json NOT NULL,
  `ai_result` json DEFAULT NULL,
  `status` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `model_version` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `prompt_version` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `error_code` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_by` int NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `completed_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ca_version` (`analysis_id`,`version`),
  KEY `idx_cav_status` (`status`),
  CONSTRAINT `fk_cav_analysis` FOREIGN KEY (`analysis_id`) REFERENCES `consultation_analysis` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `contract_assignments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `contract_assignments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `contract_id` int NOT NULL,
  `user_id` int NOT NULL,
  `role` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `assignment_type` enum('auto','manual') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'auto',
  `status` enum('pending','in_progress','completed') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `assigned_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_contract_user` (`contract_id`,`user_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_contract_id` (`contract_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=1194 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `contract_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `contract_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `contract_id` int NOT NULL,
  `user_id` int DEFAULT NULL,
  `user_name` varchar(255) DEFAULT NULL,
  `action` varchar(50) NOT NULL,
  `field` varchar(50) DEFAULT NULL,
  `old_value` varchar(500) DEFAULT NULL,
  `new_value` varchar(500) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ch_contract` (`contract_id`),
  CONSTRAINT `fk_ch_contract` FOREIGN KEY (`contract_id`) REFERENCES `contracts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `contract_payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `contract_payments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `contract_id` int NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `payment_date` date NOT NULL,
  `payment_method` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'cash',
  `payment_type` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'additional',
  `comment` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `confirmed` tinyint(1) NOT NULL DEFAULT '1',
  `confirmed_by` int DEFAULT NULL,
  `confirmed_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_contract_id` (`contract_id`),
  KEY `idx_confirmed` (`confirmed`),
  KEY `idx_contract_payment_date` (`payment_date`),
  CONSTRAINT `contract_payments_ibfk_1` FOREIGN KEY (`contract_id`) REFERENCES `contracts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=299 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `contract_periods`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `contract_periods` (
  `id` int NOT NULL AUTO_INCREMENT,
  `office_id` int NOT NULL,
  `period_start` date NOT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_cp_office` (`office_id`,`period_start`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `contracts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `contracts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_client` int NOT NULL,
  `id_employee` int NOT NULL,
  `is_joint` tinyint(1) NOT NULL DEFAULT '0',
  `second_employee_id` int DEFAULT NULL,
  `contract_type` varchar(20) NOT NULL DEFAULT 'docs',
  `expert_id` int DEFAULT NULL,
  `representative_id` int DEFAULT NULL,
  `docs_status` varchar(20) NOT NULL DEFAULT 'pending',
  `contract_date` date NOT NULL,
  `amount` decimal(15,2) NOT NULL DEFAULT '0.00',
  `paid_amount` decimal(15,2) DEFAULT '0.00',
  `status` varchar(50) DEFAULT 'active',
  `title` text,
  `description` text,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `customer_goal` varchar(500) DEFAULT NULL,
  `situation_description` text,
  `expert_deadline_days` int DEFAULT NULL,
  `expert_deadline` date DEFAULT NULL,
  `expert_deadline_time` time DEFAULT NULL,
  `expert_deadline_comment` varchar(1000) DEFAULT NULL,
  `legal_cost_comp` decimal(15,2) DEFAULT NULL,
  `moral_comp` decimal(15,2) DEFAULT NULL,
  `payment_date` date DEFAULT NULL,
  `office_id` int DEFAULT NULL,
  `terminated_at` date DEFAULT NULL,
  `termination_reason` text,
  `refund_amount` decimal(15,2) DEFAULT NULL,
  `refund_deadline` date DEFAULT NULL,
  `refund_confirmed` tinyint(1) DEFAULT '0',
  `refund_confirmed_by` int DEFAULT NULL,
  `refund_confirmed_at` timestamp NULL DEFAULT NULL,
  `refund_payment_method` enum('cash','noncash','bank') DEFAULT NULL,
  `contract_number` varchar(20) DEFAULT NULL,
  `additional_payment_date` date DEFAULT NULL,
  `additional_payment_amount` decimal(15,2) DEFAULT NULL,
  `registered_by` int DEFAULT NULL,
  `signed_by` int DEFAULT NULL,
  `payment_method` varchar(20) DEFAULT 'cash',
  `on_behalf_of` varchar(500) DEFAULT NULL,
  `needs_lawyer_input` tinyint(1) DEFAULT '0',
  `appointment_id` int DEFAULT NULL,
  `document_types` json DEFAULT NULL,
  `custom_documents` json DEFAULT NULL,
  `circumstances` text,
  `remainder_confirmed` tinyint(1) DEFAULT '0',
  `remainder_confirmed_by` int DEFAULT NULL,
  `remainder_confirmed_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `id_employee` (`id_employee`),
  KEY `idx_contracts_client` (`id_client`),
  KEY `idx_contracts_date` (`contract_date`),
  KEY `idx_contracts_type` (`contract_type`),
  KEY `idx_contracts_expert` (`expert_id`),
  KEY `idx_contracts_office` (`office_id`),
  KEY `idx_representative` (`representative_id`),
  KEY `idx_contracts_terminated` (`status`,`terminated_at`),
  KEY `idx_contracts_contract_number` (`contract_number`),
  KEY `idx_contracts_registered_by` (`registered_by`),
  KEY `idx_contracts_signed_by` (`signed_by`),
  KEY `idx_contracts_second_employee` (`second_employee_id`),
  CONSTRAINT `contracts_ibfk_1` FOREIGN KEY (`id_client`) REFERENCES `clients` (`id`) ON DELETE CASCADE,
  CONSTRAINT `contracts_ibfk_2` FOREIGN KEY (`id_employee`) REFERENCES `employees` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=298 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `employee_dismissals`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee_dismissals` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `employee_id` int NOT NULL,
  `office_id` int NOT NULL,
  `successor_id` int NOT NULL,
  `dismissed_by` int NOT NULL,
  `reason` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `transfer_summary` json NOT NULL,
  `dismissed_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_employee_dismissals_employee` (`employee_id`),
  KEY `idx_employee_dismissals_office` (`office_id`,`dismissed_at`),
  KEY `idx_employee_dismissals_successor` (`successor_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `employee_salaries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee_salaries` (
  `id` int NOT NULL AUTO_INCREMENT,
  `employee_id` int NOT NULL,
  `base_salary` decimal(12,2) NOT NULL DEFAULT '0.00',
  `custom_percent` decimal(6,3) DEFAULT NULL,
  `custom_shift_rate` decimal(12,2) DEFAULT NULL,
  `custom_per_doc` decimal(12,2) DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `employee_id` (`employee_id`),
  KEY `fk_es_user` (`updated_by`),
  CONSTRAINT `fk_es_emp` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_es_user` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=26 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `employee_salary_versions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee_salary_versions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `employee_id` int NOT NULL,
  `base_salary` decimal(12,2) NOT NULL DEFAULT '0.00',
  `custom_percent` decimal(6,3) DEFAULT NULL,
  `custom_shift_rate` decimal(12,2) DEFAULT NULL,
  `custom_per_doc` decimal(12,2) DEFAULT NULL,
  `effective_period_start` date NOT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_employee_salary_version` (`employee_id`,`effective_period_start`),
  KEY `idx_employee_salary_version_lookup` (`employee_id`,`effective_period_start`),
  KEY `fk_salary_version_user` (`created_by`),
  CONSTRAINT `fk_salary_version_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_salary_version_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `employee_stats`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee_stats` (
  `id` int NOT NULL AUTO_INCREMENT,
  `employee_id` int NOT NULL,
  `period_type` varchar(20) NOT NULL,
  `period_value` varchar(50) NOT NULL,
  `revenue` decimal(15,2) DEFAULT '0.00',
  `orders` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `employee_period_value_unique` (`employee_id`,`period_type`,`period_value`),
  KEY `idx_empstats_emp` (`employee_id`),
  CONSTRAINT `employee_stats_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=717 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `employees`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employees` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `middle_name` varchar(100) DEFAULT NULL,
  `birth_date` date DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `position` varchar(100) DEFAULT NULL,
  `office_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `passport_series` varchar(10) DEFAULT NULL,
  `passport_number` varchar(20) DEFAULT NULL,
  `passport_issued_by` varchar(255) DEFAULT NULL,
  `passport_issue_date` date DEFAULT NULL,
  `passport_department_code` varchar(10) DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `deleted_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_employees_user_id` (`user_id`),
  KEY `idx_employees_office` (`office_id`),
  CONSTRAINT `employees_ibfk_1` FOREIGN KEY (`office_id`) REFERENCES `offices` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_employees_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=143 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `existing_client_visits`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `existing_client_visits` (
  `id` int NOT NULL AUTO_INCREMENT,
  `office_id` int NOT NULL,
  `client_name` varchar(255) NOT NULL,
  `employee_id` int DEFAULT NULL,
  `visited_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` int NOT NULL,
  `comment` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_office_visited` (`office_id`,`visited_at`),
  KEY `idx_employee` (`employee_id`)
) ENGINE=InnoDB AUTO_INCREMENT=85 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `expenses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `expenses` (
  `id` int NOT NULL AUTO_INCREMENT,
  `office_id` int NOT NULL,
  `category` varchar(100) DEFAULT 'Прочее',
  `amount` decimal(15,2) NOT NULL DEFAULT '0.00',
  `expense_type` varchar(20) DEFAULT 'Разовый',
  `payment_method` varchar(20) NOT NULL DEFAULT 'cash',
  `is_auto` tinyint(1) DEFAULT '0',
  `source_type` varchar(50) DEFAULT NULL,
  `source_id` int DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `description` text,
  `spent_on` date NOT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_office` (`office_id`),
  KEY `idx_date` (`spent_on`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `expenses_ibfk_1` FOREIGN KEY (`office_id`) REFERENCES `offices` (`id`) ON DELETE CASCADE,
  CONSTRAINT `expenses_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `chk_expenses_amount_positive` CHECK ((`amount` > 0))
) ENGINE=InnoDB AUTO_INCREMENT=848 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `expert_id_backup_20260816_165353`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `expert_id_backup_20260816_165353` (
  `id` int NOT NULL DEFAULT '0',
  `expert_id` int DEFAULT NULL,
  `backup_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `financial_audit_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `financial_audit_log` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `office_id` int DEFAULT NULL,
  `user_id` int DEFAULT NULL,
  `action` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity_type` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity_id` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `amount` decimal(15,2) DEFAULT NULL,
  `ip_address` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `metadata` json DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_fin_audit_office_time` (`office_id`,`created_at`),
  KEY `idx_fin_audit_entity` (`entity_type`,`entity_id`)
) ENGINE=InnoDB AUTO_INCREMENT=33 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `financial_idempotency_keys`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `financial_idempotency_keys` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `scope` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `request_key` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `office_id` int DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_fin_idem` (`user_id`,`scope`,`request_key`),
  KEY `idx_fin_idem_created` (`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=34 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `join_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `join_requests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `office_id` int NOT NULL,
  `role` varchar(50) DEFAULT 'lawyer',
  `status` enum('pending','approved','rejected') DEFAULT 'pending',
  `message` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_office` (`office_id`),
  KEY `idx_status` (`status`),
  CONSTRAINT `join_requests_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `join_requests_ibfk_2` FOREIGN KEY (`office_id`) REFERENCES `offices` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `legal_documents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `legal_documents` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `content` text NOT NULL,
  `category` varchar(100) DEFAULT NULL,
  `tags` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `materials`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `materials` (
  `id` int NOT NULL AUTO_INCREMENT,
  `office_id` int NOT NULL,
  `case_id` int DEFAULT NULL,
  `contract_id` int DEFAULT NULL,
  `act_id` int DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `category` varchar(100) DEFAULT 'Документ',
  `description` text,
  `file_url` varchar(500) DEFAULT NULL,
  `mime_type` varchar(100) DEFAULT NULL,
  `size_bytes` bigint DEFAULT '0',
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_office` (`office_id`),
  KEY `idx_case` (`case_id`),
  KEY `contract_id` (`contract_id`),
  KEY `created_by` (`created_by`),
  KEY `idx_materials_act` (`act_id`),
  CONSTRAINT `materials_ibfk_1` FOREIGN KEY (`office_id`) REFERENCES `offices` (`id`) ON DELETE CASCADE,
  CONSTRAINT `materials_ibfk_2` FOREIGN KEY (`case_id`) REFERENCES `cases` (`id`) ON DELETE SET NULL,
  CONSTRAINT `materials_ibfk_3` FOREIGN KEY (`contract_id`) REFERENCES `contracts` (`id`) ON DELETE SET NULL,
  CONSTRAINT `materials_ibfk_4` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=150 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `messages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `office_id` int NOT NULL,
  `channel` varchar(50) DEFAULT 'reception',
  `sender_id` int NOT NULL,
  `content` text NOT NULL,
  `is_read` tinyint(1) DEFAULT '0',
  `status` enum('sent','delivered','read') NOT NULL DEFAULT 'sent',
  `file_url` varchar(500) DEFAULT NULL,
  `file_name` varchar(255) DEFAULT NULL,
  `file_type` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_office` (`office_id`),
  KEY `idx_sender` (`sender_id`),
  KEY `idx_messages_channel` (`office_id`,`channel`,`created_at`),
  KEY `idx_messages_office` (`office_id`),
  KEY `idx_messages_status` (`office_id`,`channel`,`status`),
  CONSTRAINT `messages_ibfk_1` FOREIGN KEY (`office_id`) REFERENCES `offices` (`id`) ON DELETE CASCADE,
  CONSTRAINT `messages_ibfk_2` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=507 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notifications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `office_id` int DEFAULT NULL,
  `contract_id` int DEFAULT NULL,
  `type` varchar(50) NOT NULL DEFAULT 'info',
  `title` varchar(255) NOT NULL,
  `message` text,
  `dedup_key` varchar(191) DEFAULT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_dedup` (`dedup_key`),
  KEY `idx_user` (`user_id`,`is_read`),
  KEY `idx_contract` (`contract_id`)
) ENGINE=InnoDB AUTO_INCREMENT=1390 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `office_balance_opening`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `office_balance_opening` (
  `id` int NOT NULL AUTO_INCREMENT,
  `office_id` int NOT NULL,
  `start_date` date NOT NULL,
  `opening_cash` decimal(15,2) NOT NULL DEFAULT '0.00',
  `opening_noncash` decimal(15,2) NOT NULL DEFAULT '0.00',
  `opening_bank` decimal(15,2) NOT NULL DEFAULT '0.00',
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `office_id` (`office_id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `office_call_centers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `office_call_centers` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `office_id` int NOT NULL,
  `call_center_id` bigint unsigned NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `connected_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `disconnected_at` datetime DEFAULT NULL,
  `connected_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_office_call_center` (`office_id`,`call_center_id`),
  KEY `idx_office_cc_active` (`office_id`,`is_active`),
  KEY `idx_cc_office_active` (`call_center_id`,`is_active`),
  KEY `fk_office_cc_actor` (`connected_by`),
  CONSTRAINT `fk_office_cc_actor` FOREIGN KEY (`connected_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_office_cc_center` FOREIGN KEY (`call_center_id`) REFERENCES `call_centers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_office_cc_office` FOREIGN KEY (`office_id`) REFERENCES `offices` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `office_income`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `office_income` (
  `id` int NOT NULL AUTO_INCREMENT,
  `office_id` int NOT NULL,
  `income_date` date NOT NULL,
  `payment_method` varchar(20) NOT NULL DEFAULT 'cash',
  `amount` decimal(15,2) NOT NULL DEFAULT '0.00',
  `title` varchar(255) DEFAULT NULL,
  `description` text,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `source_type` varchar(50) DEFAULT NULL,
  `source_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_office` (`office_id`),
  KEY `idx_date` (`income_date`),
  KEY `idx_income_source` (`source_type`,`source_id`),
  CONSTRAINT `chk_office_income_amount_positive` CHECK ((`amount` > 0))
) ENGINE=InnoDB AUTO_INCREMENT=81 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `office_integrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `office_integrations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `office_id` int NOT NULL,
  `provider` varchar(50) NOT NULL DEFAULT 'gainnet',
  `api_key` varchar(255) NOT NULL,
  `webhook_key` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `last_poll_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_office_provider` (`office_id`,`provider`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `office_lead_api_keys`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `office_lead_api_keys` (
  `id` int NOT NULL AUTO_INCREMENT,
  `office_id` int NOT NULL,
  `provider` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pravoved',
  `label` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `api_key` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_by` int DEFAULT NULL,
  `last_verified_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_office_lead_api_keys_office` (`office_id`,`provider`),
  CONSTRAINT `fk_office_lead_api_keys_office` FOREIGN KEY (`office_id`) REFERENCES `offices` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `call_center_lead_integrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `call_center_lead_integrations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `call_center_id` bigint unsigned NOT NULL,
  `target_office_id` int NOT NULL,
  `provider` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `label` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `account_identifier` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `api_key` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `api_key_hash` char(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `webhook_key` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `last_verified_at` datetime DEFAULT NULL,
  `last_poll_at` datetime DEFAULT NULL,
  `last_success_at` datetime DEFAULT NULL,
  `last_error` varchar(1000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_cc_lead_provider` (`call_center_id`,`provider`),
  UNIQUE KEY `uq_lead_provider_key` (`provider`,`api_key_hash`),
  KEY `idx_cc_lead_integrations_active` (`provider`,`is_active`),
  KEY `fk_cc_lead_integration_office` (`target_office_id`),
  KEY `fk_cc_lead_integration_creator` (`created_by`),
  CONSTRAINT `fk_cc_lead_integration_center` FOREIGN KEY (`call_center_id`) REFERENCES `call_centers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cc_lead_integration_office` FOREIGN KEY (`target_office_id`) REFERENCES `offices` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cc_lead_integration_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `office_plans`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `office_plans` (
  `id` int NOT NULL AUTO_INCREMENT,
  `office_id` int NOT NULL,
  `daily_plan_weekday` decimal(15,2) NOT NULL DEFAULT '0.00',
  `daily_plan_weekend` decimal(15,2) NOT NULL DEFAULT '0.00',
  `period_plan_amount` decimal(15,2) NOT NULL DEFAULT '0.00',
  `period_start` date NOT NULL,
  `period_end` date NOT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_office_plans_office` (`office_id`),
  KEY `idx_office_plans_period` (`period_start`,`period_end`),
  CONSTRAINT `fk_office_plans_office` FOREIGN KEY (`office_id`) REFERENCES `offices` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `office_salary_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `office_salary_settings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `office_id` int NOT NULL,
  `lawyer_percent` decimal(6,3) NOT NULL DEFAULT '10.000',
  `lawyer_bonus_threshold` decimal(14,2) NOT NULL DEFAULT '500000.00',
  `lawyer_bonus_percent` decimal(6,3) NOT NULL DEFAULT '12.000',
  `okk_percent` decimal(6,3) NOT NULL DEFAULT '10.000',
  `okk_bonus_threshold` decimal(14,2) NOT NULL DEFAULT '500000.00',
  `okk_bonus_percent` decimal(6,3) NOT NULL DEFAULT '12.000',
  `manager_office_percent` decimal(6,3) NOT NULL DEFAULT '5.000',
  `representative_percent` decimal(6,3) NOT NULL DEFAULT '20.000',
  `admin_shift_rate` decimal(12,2) NOT NULL DEFAULT '2000.00',
  `expert_per_doc_amount` decimal(12,2) NOT NULL DEFAULT '1500.00',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `office_id` (`office_id`),
  KEY `fk_oss_user` (`updated_by`),
  CONSTRAINT `fk_oss_office` FOREIGN KEY (`office_id`) REFERENCES `offices` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_oss_user` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `office_financial_cycles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `office_financial_cycles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `office_id` int NOT NULL,
  `cycle_type` enum('semi_monthly') NOT NULL DEFAULT 'semi_monthly',
  `is_enabled` tinyint(1) NOT NULL DEFAULT '1',
  `effective_from` date NOT NULL,
  `activated_by` int DEFAULT NULL,
  `activated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_office_financial_cycle` (`office_id`),
  KEY `fk_financial_cycle_user` (`activated_by`),
  CONSTRAINT `fk_financial_cycle_office` FOREIGN KEY (`office_id`) REFERENCES `offices` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_financial_cycle_user` FOREIGN KEY (`activated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `office_stats`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `office_stats` (
  `id` int NOT NULL AUTO_INCREMENT,
  `office_id` int NOT NULL,
  `period_type` varchar(20) NOT NULL,
  `period_value` varchar(50) NOT NULL DEFAULT '',
  `revenue` decimal(15,2) DEFAULT '0.00',
  `orders` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `office_period_unique` (`office_id`,`period_type`,`period_value`),
  KEY `idx_officestats_office` (`office_id`),
  CONSTRAINT `office_stats_ibfk_1` FOREIGN KEY (`office_id`) REFERENCES `offices` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=717 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `office_transfers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `office_transfers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `office_id` int NOT NULL,
  `source_bucket` enum('cash','noncash','bank') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `destination_bucket` enum('cash','noncash','bank') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `transfer_date` date NOT NULL,
  `comment` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_office_transfers_date` (`office_id`,`transfer_date`),
  CONSTRAINT `fk_office_transfers_office` FOREIGN KEY (`office_id`) REFERENCES `offices` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_office_transfers_amount` CHECK ((`amount` > 0)),
  CONSTRAINT `chk_office_transfers_buckets` CHECK ((`source_bucket` <> `destination_bucket`))
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `offices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `offices` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `address` text,
  `phone` varchar(50) DEFAULT NULL,
  `contact_phone` varchar(50) DEFAULT NULL,
  `work_phone` varchar(50) DEFAULT NULL,
  `work_phone2` varchar(50) DEFAULT NULL,
  `inn` varchar(20) DEFAULT NULL,
  `ogrn` varchar(20) DEFAULT NULL,
  `ip_surname` varchar(100) DEFAULT NULL,
  `ip_name` varchar(100) DEFAULT NULL,
  `ip_middle_name` varchar(100) DEFAULT NULL,
  `owner_id` int DEFAULT NULL,
  `is_test` tinyint(1) NOT NULL DEFAULT '0',
  `external_notifications_enabled` tinyint(1) NOT NULL DEFAULT '1',
  `website` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `timezone` varchar(64) NOT NULL DEFAULT 'Asia/Tomsk',
  PRIMARY KEY (`id`),
  KEY `idx_offices_owner` (`owner_id`),
  KEY `idx_offices_owner_test` (`owner_id`,`is_test`)
) ENGINE=InnoDB AUTO_INCREMENT=35 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `salary_payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `salary_payments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `office_id` int NOT NULL,
  `employee_id` int NOT NULL,
  `period_from` date NOT NULL,
  `period_to` date NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `payment_method` enum('cash','noncash','bank') COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('paid','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'paid',
  `active_flag` tinyint DEFAULT '1',
  `calculation_snapshot` json DEFAULT NULL,
  `expense_id` int DEFAULT NULL,
  `reversal_income_id` int DEFAULT NULL,
  `paid_by` int NOT NULL,
  `paid_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `cancelled_by` int DEFAULT NULL,
  `cancelled_at` datetime DEFAULT NULL,
  `cancellation_reason` varchar(1000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `replacement_payment_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_salary_active_payment` (`office_id`,`employee_id`,`period_from`,`period_to`,`active_flag`),
  KEY `idx_salary_payment_period` (`office_id`,`period_from`,`period_to`,`status`),
  KEY `fk_salary_payment_employee` (`employee_id`),
  KEY `fk_salary_payment_expense` (`expense_id`),
  KEY `fk_salary_payment_income` (`reversal_income_id`),
  KEY `fk_salary_payment_paid_by` (`paid_by`),
  KEY `fk_salary_payment_cancelled_by` (`cancelled_by`),
  CONSTRAINT `fk_salary_payment_cancelled_by` FOREIGN KEY (`cancelled_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_salary_payment_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_salary_payment_expense` FOREIGN KEY (`expense_id`) REFERENCES `expenses` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_salary_payment_income` FOREIGN KEY (`reversal_income_id`) REFERENCES `office_income` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_salary_payment_office` FOREIGN KEY (`office_id`) REFERENCES `offices` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_salary_payment_paid_by` FOREIGN KEY (`paid_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `chk_salary_payments_amount_positive` CHECK ((`amount` > 0))
) ENGINE=InnoDB AUTO_INCREMENT=31 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `shifts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `shifts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `office_id` int NOT NULL,
  `employee_id` int NOT NULL,
  `shift_date` date NOT NULL,
  `note` varchar(255) DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_shift` (`employee_id`,`shift_date`),
  KEY `idx_shift_office_date` (`office_id`,`shift_date`),
  KEY `fk_shift_user` (`created_by`),
  CONSTRAINT `fk_shift_emp` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_shift_office` FOREIGN KEY (`office_id`) REFERENCES `offices` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_shift_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `user_office_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_office_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `office_id` int NOT NULL,
  `office_name` varchar(255) DEFAULT NULL,
  `action` enum('added','removed') NOT NULL,
  `changed_by` int DEFAULT NULL,
  `changed_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_uoh_user` (`user_id`),
  KEY `idx_uoh_changed_at` (`changed_at`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `user_offices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_offices` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `office_id` int NOT NULL,
  `assigned_by` int DEFAULT NULL,
  `assigned_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_office` (`user_id`,`office_id`),
  KEY `idx_user_offices_user` (`user_id`),
  KEY `idx_user_offices_office` (`office_id`),
  CONSTRAINT `fk_uo_office` FOREIGN KEY (`office_id`) REFERENCES `offices` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_uo_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=157 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `middle_name` varchar(100) DEFAULT NULL,
  `email` varchar(255) NOT NULL,
  `login` varchar(100) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `role` varchar(50) NOT NULL DEFAULT 'lawyer',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `must_change_password` tinyint(1) NOT NULL DEFAULT '0',
  `created_by` int DEFAULT NULL,
  `office_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `email_verified` tinyint(1) NOT NULL DEFAULT '0',
  `verification_token` varchar(64) DEFAULT NULL,
  `verification_expires` datetime DEFAULT NULL,
  `verification_code` varchar(6) DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `deleted_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `login` (`login`),
  KEY `office_id` (`office_id`),
  KEY `idx_users_role_office` (`role`,`office_id`),
  CONSTRAINT `users_ibfk_1` FOREIGN KEY (`office_id`) REFERENCES `offices` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=130 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `workflow_events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `workflow_events` (
  `id` int NOT NULL AUTO_INCREMENT,
  `event_type` varchar(100) NOT NULL,
  `contract_id` int DEFAULT NULL,
  `office_id` int DEFAULT NULL,
  `actor_user_id` int DEFAULT NULL,
  `payload` json DEFAULT NULL,
  `processed` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `processed` (`processed`),
  KEY `contract_id` (`contract_id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `workflow_rules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `workflow_rules` (
  `id` int NOT NULL AUTO_INCREMENT,
  `office_id` int DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `trigger_event` varchar(100) NOT NULL,
  `trigger_value` varchar(100) DEFAULT NULL,
  `target_role` varchar(50) DEFAULT NULL,
  `task_title` varchar(255) NOT NULL,
  `task_desc` varchar(1000) DEFAULT NULL,
  `due_offset_hours` int NOT NULL DEFAULT '24',
  `remind_before_hours` int DEFAULT NULL,
  `escalate_role` varchar(50) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `workflow_tasks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `workflow_tasks` (
  `id` int NOT NULL AUTO_INCREMENT,
  `rule_id` int DEFAULT NULL,
  `contract_id` int DEFAULT NULL,
  `office_id` int DEFAULT NULL,
  `assignee_user_id` int DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `description` varchar(1000) DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'open',
  `due_at` datetime DEFAULT NULL,
  `done_at` datetime DEFAULT NULL,
  `dedup_key` varchar(191) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `dedup_key` (`dedup_key`),
  KEY `contract_id` (`contract_id`),
  KEY `assignee_user_id` (`assignee_user_id`),
  KEY `status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

CREATE TABLE `lead_preorder_quality` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `provider` varchar(50) NOT NULL DEFAULT 'pravoved',
  `preorder_id` varchar(64) NOT NULL,
  `label` varchar(50) NOT NULL,
  `score` tinyint unsigned NOT NULL DEFAULT '50',
  `comment` varchar(500) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_by` int DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_lead_preorder_quality` (`provider`,`preorder_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
