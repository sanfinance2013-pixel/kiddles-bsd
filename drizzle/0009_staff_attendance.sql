CREATE TABLE `officeLocations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`address` text,
	`latitude` varchar(24) NOT NULL,
	`longitude` varchar(24) NOT NULL,
	`radiusMeters` int NOT NULL DEFAULT 1,
	`isActive` enum('yes','no') NOT NULL DEFAULT 'yes',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `officeLocations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `staffAttendance` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` enum('check_in','check_out') NOT NULL,
	`status` enum('ok','out_of_range','low_accuracy','pending_review') NOT NULL DEFAULT 'ok',
	`latitude` varchar(24) NOT NULL,
	`longitude` varchar(24) NOT NULL,
	`accuracyMeters` int,
	`distanceMeters` int,
	`officeLocationId` int,
	`photoObjectKey` varchar(255),
	`photoUrl` varchar(512),
	`note` text,
	`userAgent` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`deletedAt` timestamp,
	CONSTRAINT `staffAttendance_id` PRIMARY KEY(`id`)
);
