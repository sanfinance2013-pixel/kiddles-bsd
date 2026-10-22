CREATE TABLE `studentQrTokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`studentId` int NOT NULL,
	`tokenHash` varchar(128) NOT NULL,
	`status` enum('active','revoked') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `studentQrTokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `studentQrTokens_studentId_unique` UNIQUE(`studentId`),
	CONSTRAINT `studentQrTokens_tokenHash_unique` UNIQUE(`tokenHash`)
);
