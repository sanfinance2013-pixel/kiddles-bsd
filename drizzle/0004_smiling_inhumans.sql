CREATE TABLE `chartOfAccounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(20) NOT NULL,
	`name` varchar(160) NOT NULL,
	`accountType` enum('asset','liability','equity','revenue','expense') NOT NULL,
	`normalBalance` enum('debit','credit') NOT NULL,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `chartOfAccounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `chartOfAccounts_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `journalEntries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entryNumber` varchar(48) NOT NULL,
	`entryDate` timestamp NOT NULL,
	`referenceType` varchar(60) NOT NULL,
	`referenceId` int,
	`description` varchar(255) NOT NULL,
	`status` enum('draft','posted','void') NOT NULL DEFAULT 'posted',
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `journalEntries_id` PRIMARY KEY(`id`),
	CONSTRAINT `journalEntries_entryNumber_unique` UNIQUE(`entryNumber`)
);
--> statement-breakpoint
CREATE TABLE `journalLines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`journalEntryId` int NOT NULL,
	`accountId` int NOT NULL,
	`debit` int NOT NULL DEFAULT 0,
	`credit` int NOT NULL DEFAULT 0,
	`memo` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `journalLines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `procurements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`purchaseNumber` varchar(48) NOT NULL,
	`vendorName` varchar(160) NOT NULL,
	`itemName` varchar(200) NOT NULL,
	`category` enum('operasional','aset_peralatan','bahan_ajar','marketing','kebersihan','teknologi','lainnya') NOT NULL,
	`purchaseDate` timestamp NOT NULL,
	`subtotal` int NOT NULL,
	`tax` int NOT NULL DEFAULT 0,
	`total` int NOT NULL,
	`paymentMethod` enum('cash','bank','payable') NOT NULL,
	`status` enum('draft','submitted','approved','paid','cancelled') NOT NULL DEFAULT 'draft',
	`expenseAccountId` int NOT NULL,
	`assetAccountId` int,
	`note` text,
	`createdBy` int,
	`approvedBy` int,
	`approvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deletedAt` timestamp,
	CONSTRAINT `procurements_id` PRIMARY KEY(`id`),
	CONSTRAINT `procurements_purchaseNumber_unique` UNIQUE(`purchaseNumber`)
);
