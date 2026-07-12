-- MySQL dump 10.13  Distrib 8.0.46, for Linux (x86_64)
--
-- Host: localhost    Database: lawtech_crm
-- ------------------------------------------------------
-- Server version	8.0.46

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

--
-- Table structure for table `acts`
--

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
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `acts`
--

LOCK TABLES `acts` WRITE;
/*!40000 ALTER TABLE `acts` DISABLE KEYS */;
INSERT INTO `acts` VALUES (1,16,37,'2026-05-06',50000.00,'docs',28,'confirmed','Акт выполненных работ: составление претензии к страховой компании, подготовка искового заявления, сбор доказательной базы',28,'2026-05-06 04:34:14','2026-05-06 04:33:54','2026-05-06 04:34:14'),(2,16,24,'2026-05-06',80000.00,'court_rep',35,'confirmed','Представление интересов клиента',23,NULL,'2026-05-06 05:16:39','2026-05-06 05:16:39'),(3,16,23,'2026-05-06',60000.00,'docs',28,'confirmed','Составление документов - 2й акт',28,NULL,'2026-05-06 05:16:39','2026-05-06 05:16:39'),(4,16,25,'2026-05-06',45000.00,'docs',23,'confirmed','Документы от директора',23,NULL,'2026-05-06 05:16:39','2026-05-06 05:16:39'),(5,16,26,'2026-05-06',35000.00,'docs',31,'confirmed','Экспертиза документов',31,NULL,'2026-05-06 05:16:39','2026-05-06 05:16:39'),(6,16,27,'2026-05-06',40000.00,'docs',26,'confirmed','Менеджер - личный акт',26,NULL,'2026-05-06 05:16:39','2026-05-06 05:16:39'),(7,25,41,'2026-05-10',25000.00,'docs',59,'confirmed','выдана претензия ',59,'2026-05-10 05:50:00','2026-05-10 05:49:45','2026-05-10 05:50:00'),(8,25,42,'2026-05-10',30000.00,'court_rep',67,'confirmed','составил документы ',67,'2026-05-10 12:37:14','2026-05-10 11:00:03','2026-05-10 12:37:14'),(9,25,43,'2026-05-12',30000.00,'docs',63,'confirmed','претензия',63,'2026-05-12 14:49:53','2026-05-12 14:48:38','2026-05-12 14:49:53'),(10,25,48,'2026-05-24',56000.00,'docs',63,'confirmed','Претензия',63,'2026-05-23 20:52:03','2026-05-23 20:03:49','2026-05-23 20:52:03'),(12,25,47,'2026-06-06',1000.00,'court_rep',66,'confirmed','jbkbkjb',66,'2026-06-06 12:51:03','2026-06-06 12:50:35','2026-06-06 12:51:03'),(13,25,47,'2026-06-06',5000.00,'court_rep',66,'confirmed','mnvndfgd',66,'2026-06-06 13:08:37','2026-06-06 13:07:17','2026-06-06 13:08:37'),(14,25,47,'2026-06-06',50000.00,'court_rep',66,'confirmed','ваапвапвапв',66,'2026-06-06 14:49:17','2026-06-06 14:47:32','2026-06-06 14:49:17'),(17,16,39,'2026-06-06',100.00,'docs',23,'confirmed','Confirm test',23,'2026-06-06 15:36:59','2026-06-06 15:36:58','2026-06-06 15:36:59'),(18,16,39,'2026-06-06',100.00,'docs',23,'confirmed','Confirm test 2',23,'2026-06-06 15:37:00','2026-06-06 15:37:00','2026-06-06 15:37:00'),(20,16,39,'2026-06-06',100.00,'docs',23,'confirmed','Confirm test',23,'2026-06-06 15:54:03','2026-06-06 15:54:03','2026-06-06 15:54:03'),(21,31,65,'2026-06-11',5000.00,'docs',79,'confirmed','Изучение материалов представленных лицом, в интересах котрого заключен договор возмездного оказания услуг. Разработка правовой позиции по гражданскому делу направленной на улучшение процессуального положения лица , в отношении котрого заключен договор возмездного оказания услуг.',79,'2026-06-11 10:51:08','2026-06-11 10:50:53','2026-06-11 10:51:08'),(22,31,62,'2026-06-12',40000.00,'docs',79,'confirmed','Заявление в СФР (стаж)\nЗаявление в СФР (детальный расчет пенсии)',79,'2026-06-12 09:58:51','2026-06-12 09:58:40','2026-06-12 09:58:51'),(23,31,66,'2026-06-16',50000.00,'docs',79,'confirmed','Подготовка и выдача: 1. Обращение в Администрацию \n2. Исковое заявление \n3. Ходатайство ',79,'2026-06-17 03:00:31','2026-06-17 03:00:25','2026-06-17 03:00:31'),(24,31,64,'2026-06-16',40000.00,'docs',79,'confirmed','Подготовка и выдача документов ',79,'2026-06-17 03:28:39','2026-06-17 03:27:58','2026-06-17 03:28:39');
/*!40000 ALTER TABLE `acts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `offices`
--

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
  `website` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_offices_owner` (`owner_id`)
) ENGINE=InnoDB AUTO_INCREMENT=32 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `offices`
--

LOCK TABLES `offices` WRITE;
/*!40000 ALTER TABLE `offices` DISABLE KEYS */;
INSERT INTO `offices` VALUES (1,'Test edit','Москва','+70000000000','+70000000001','+70000000001',NULL,'7700999999','1027700999999','Иванов',NULL,NULL,NULL,NULL,'2026-04-26 17:44:16','2026-04-28 14:08:25'),(2,'Филиал «Север»','г. Москва, ул. Демо','+7 (495) 000-0000',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-04-26 18:35:34','2026-04-26 18:35:34'),(3,'Филиал «Юг»','г. Москва, ул. Демо','+7 (495) 000-0000',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-04-26 18:35:34','2026-04-26 18:35:34'),(7,'Петр Директоров — офис',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-04-27 18:42:56','2026-04-27 18:42:56'),(8,'Иркутск','Москва , ул Неглинная 12',NULL,'89966665445','89966665445','89964133221','7734598987','3435636788','Маракин','Константин ','Владимирович',5,NULL,'2026-04-27 19:09:24','2026-04-27 19:09:24'),(10,'Иван Админов — офис',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-04-28 18:25:00','2026-04-28 18:25:00'),(11,'Иван Админов — офис',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-04-28 18:25:00','2026-04-28 18:25:00'),(12,'Генеральный Директор — офис',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,18,NULL,'2026-04-28 19:53:01','2026-04-30 03:45:37'),(13,'Тестовый офис',NULL,NULL,NULL,NULL,NULL,'1234567890','1234567890123','Иванов','Иван',NULL,NULL,NULL,'2026-04-28 20:36:42','2026-04-28 20:36:42'),(14,'Кемерово ',NULL,NULL,NULL,'89099877665','89233214455','42305365092','58009212487','Маракин ','Константин ','Владимирович',NULL,NULL,'2026-04-29 02:54:47','2026-06-04 04:47:24'),(15,'Кемерово ','Москва, ул Пушкина 12',NULL,'89099877665','89099877665','89233214455','42305365092','58009212487','Илгарович','Эльдар','Владимирович',NULL,NULL,'2026-04-29 10:20:38','2026-04-29 10:20:38'),(16,'Артем Давтян — офис',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,23,NULL,'2026-04-29 10:37:18','2026-04-30 03:45:37'),(17,'Иван Смирнов — офис',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-04-29 10:43:18','2026-04-29 10:43:18'),(18,'Саша Малинина — офис',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-04-29 10:46:26','2026-04-29 10:46:26'),(19,'Иван Админов — офис',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-05-03 15:49:48','2026-05-03 15:49:48'),(21,'Юридическая компания ','ул. Свободы 37',NULL,'89964127656',NULL,NULL,NULL,NULL,NULL,NULL,NULL,37,'','2026-05-09 05:18:28','2026-05-09 05:18:28'),(22,'Иркутск',' ул Неглинная 12',NULL,'',NULL,NULL,'7734598987','3435636788','Маракин','Константин ','Владимирович',37,NULL,'2026-05-09 05:30:10','2026-05-09 05:30:10'),(23,'LawTech Москва','г. Москва, ул. Тверская, д. 15',NULL,'+7 (495) 123-45-67',NULL,NULL,NULL,NULL,NULL,NULL,NULL,41,NULL,'2026-05-09 07:44:52','2026-05-09 07:44:52'),(24,'LawTech Санкт-Петербург','г. Санкт-Петербург, Невский пр., д. 28',NULL,'+7 (812) 987-65-43',NULL,NULL,NULL,NULL,NULL,NULL,NULL,41,NULL,'2026-05-09 07:44:52','2026-05-09 07:44:52'),(25,'Офис Соколова','г. Москва, ул. Ленина, д. 10',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,58,NULL,'2026-05-09 17:17:36','2026-05-09 17:17:36'),(26,'Иркутск','Москва , ул Неглинная 12',NULL,'89966665445','89966665445','89964133221','7734598987','3435636788','Маракин','Константин ','Владимирович',58,NULL,'2026-05-15 18:34:12','2026-05-15 18:34:12'),(27,'Юридическая компания Кемерово','г. Кемерово, ул. Свободы 37',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,71,NULL,'2026-05-17 17:41:26','2026-06-04 05:34:56'),(28,'Анна Петрова — офис',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-05-23 10:22:34','2026-05-23 10:22:34'),(29,'Анна Юристова — офис',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-05-23 11:07:03','2026-05-23 11:07:03'),(30,'Анна Юристова — офис',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-05-23 11:07:03','2026-05-23 11:07:03'),(31,'Юридическая компания Новокузнецк','г. Новокузнецк, ул. Толльяти 5Б',NULL,'',NULL,NULL,NULL,NULL,NULL,NULL,NULL,71,NULL,'2026-06-05 10:39:55','2026-06-05 10:39:55');
/*!40000 ALTER TABLE `offices` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-06-25  3:54:29
