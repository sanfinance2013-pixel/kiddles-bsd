CREATE TABLE `activityLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actorUserId` int,
	`entityType` varchar(80) NOT NULL,
	`entityId` int,
	`action` varchar(100) NOT NULL,
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `activityLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `attendance` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`studentId` int NOT NULL,
	`status` enum('present','excused','sick','absent') NOT NULL,
	`source` enum('qr','manual') NOT NULL DEFAULT 'qr',
	`recordedBy` int NOT NULL,
	`recordedAt` timestamp NOT NULL DEFAULT (now()),
	`deletedAt` timestamp,
	CONSTRAINT `attendance_id` PRIMARY KEY(`id`),
	CONSTRAINT `attendance_session_student_unique` UNIQUE(`sessionId`,`studentId`)
);
--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`invoiceNumber` varchar(48) NOT NULL,
	`studentId` int NOT NULL,
	`packageId` int,
	`subtotal` int NOT NULL,
	`discount` int NOT NULL DEFAULT 0,
	`adminFee` int NOT NULL DEFAULT 0,
	`tax` int NOT NULL DEFAULT 0,
	`total` int NOT NULL,
	`paidAmount` int NOT NULL DEFAULT 0,
	`status` enum('unpaid','partial','paid','overdue','cancelled') NOT NULL DEFAULT 'unpaid',
	`dueDate` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deletedAt` timestamp,
	CONSTRAINT `invoices_id` PRIMARY KEY(`id`),
	CONSTRAINT `invoices_invoiceNumber_unique` UNIQUE(`invoiceNumber`)
);
--> statement-breakpoint
CREATE TABLE `packages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`program` varchar(80) NOT NULL,
	`price` int NOT NULL,
	`sessionCount` int NOT NULL,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `packages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `paymentEvidence` (
	`id` int AUTO_INCREMENT NOT NULL,
	`invoiceId` int NOT NULL,
	`objectKey` varchar(255) NOT NULL,
	`stableUrl` varchar(512) NOT NULL,
	`mimeType` varchar(100) NOT NULL,
	`amount` int NOT NULL,
	`status` enum('pending','approved','rejected','review') NOT NULL DEFAULT 'pending',
	`note` text,
	`createdBy` int,
	`reviewedBy` int,
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deletedAt` timestamp,
	CONSTRAINT `paymentEvidence_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sessionQrTokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`tokenHash` varchar(128) NOT NULL,
	`activeFrom` timestamp NOT NULL,
	`activeUntil` timestamp NOT NULL,
	`status` enum('inactive','active','closed','cancelled') NOT NULL DEFAULT 'inactive',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sessionQrTokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `sessionQrTokens_sessionId_unique` UNIQUE(`sessionId`),
	CONSTRAINT `sessionQrTokens_tokenHash_unique` UNIQUE(`tokenHash`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`className` varchar(160) NOT NULL,
	`program` varchar(80) NOT NULL,
	`teacherUserId` int,
	`room` varchar(120),
	`startsAt` timestamp NOT NULL,
	`endsAt` timestamp NOT NULL,
	`status` enum('scheduled','active','completed','rescheduled','cancelled') NOT NULL DEFAULT 'scheduled',
	`qrStatus` enum('inactive','active','closed','cancelled') NOT NULL DEFAULT 'inactive',
	`qrActivatedAt` timestamp,
	`qrClosedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deletedAt` timestamp,
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `students` (
	`id` int AUTO_INCREMENT NOT NULL,
	`studentNo` varchar(32) NOT NULL,
	`fullName` varchar(160) NOT NULL,
	`guardianName` varchar(160) NOT NULL,
	`guardianPhone` varchar(32),
	`program` varchar(80) NOT NULL,
	`status` enum('active','leave','stopped') NOT NULL DEFAULT 'active',
	`remainingSessions` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deletedAt` timestamp,
	CONSTRAINT `students_id` PRIMARY KEY(`id`),
	CONSTRAINT `students_studentNo_unique` UNIQUE(`studentNo`)
);
--> statement-breakpoint
CREATE TABLE `teacherPayouts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`teacherUserId` int NOT NULL,
	`periodStart` timestamp NOT NULL,
	`periodEnd` timestamp NOT NULL,
	`grossAmount` int NOT NULL DEFAULT 0,
	`taxAmount` int NOT NULL DEFAULT 0,
	`deductions` int NOT NULL DEFAULT 0,
	`netAmount` int NOT NULL DEFAULT 0,
	`status` enum('draft','reviewed','approved','paid','cancelled') NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deletedAt` timestamp,
	CONSTRAINT `teacherPayouts_id` PRIMARY KEY(`id`)
);
