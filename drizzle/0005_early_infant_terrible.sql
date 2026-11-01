CREATE TABLE `taxProfiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`taxpayerName` varchar(200) NOT NULL,
	`npwp` varchar(32),
	`nitku` varchar(32),
	`entityType` enum('orang_pribadi','pt','cv','koperasi','lainnya') NOT NULL,
	`taxRegime` enum('umkm_final_05','general_corporate_22','personal_progressive','custom') NOT NULL,
	`isPkp` int NOT NULL DEFAULT 0,
	`educationLicenseVerified` int NOT NULL DEFAULT 0,
	`vatTreatment` enum('non_ppn_education','ppn_11','ppn_12_luxury','custom') NOT NULL,
	`customPphRateBps` int,
	`customVatRateBps` int,
	`taxYear` int NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `taxProfiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `taxReports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`period` varchar(7) NOT NULL,
	`taxType` enum('pph21','pph23','pph_final_umkm','pph_badan','ppn_keluaran','ppn_masukan','materai','other') NOT NULL,
	`totalBase` int NOT NULL DEFAULT 0,
	`totalTax` int NOT NULL DEFAULT 0,
	`dueDate` timestamp NOT NULL,
	`status` enum('draft','ready','paid','reported') NOT NULL DEFAULT 'draft',
	`generatedAt` timestamp NOT NULL DEFAULT (now()),
	`createdBy` int,
	`note` text,
	CONSTRAINT `taxReports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `taxTransactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`period` varchar(7) NOT NULL,
	`taxType` enum('pph21','pph23','pph_final_umkm','pph_badan','ppn_keluaran','ppn_masukan','materai','other') NOT NULL,
	`referenceType` varchar(60),
	`referenceId` int,
	`counterpartyName` varchar(180),
	`taxBase` int NOT NULL,
	`rateBps` int NOT NULL,
	`taxAmount` int NOT NULL,
	`status` enum('draft','ready','paid','reported') NOT NULL DEFAULT 'draft',
	`note` text,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deletedAt` timestamp,
	CONSTRAINT `taxTransactions_id` PRIMARY KEY(`id`)
);
