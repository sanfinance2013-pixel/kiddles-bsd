CREATE TABLE `leads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fullName` varchar(160) NOT NULL,
	`guardianName` varchar(160) NOT NULL,
	`guardianPhone` varchar(32),
	`program` varchar(80) NOT NULL,
	`source` varchar(80) NOT NULL DEFAULT 'Tidak diketahui',
	`status` enum('new','contacted','trial_scheduled','trial_done','enrolled','lost') NOT NULL DEFAULT 'new',
	`trialAt` timestamp,
	`followUpAt` timestamp,
	`note` text,
	`convertedStudentId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deletedAt` timestamp,
	CONSTRAINT `leads_id` PRIMARY KEY(`id`)
);
