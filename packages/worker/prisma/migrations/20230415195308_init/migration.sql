-- CreateTable
CREATE TABLE `Team` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `User` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Resource` (
    `title` VARCHAR(1024) NOT NULL,
    `href` VARCHAR(600) NOT NULL,
    `type` TINYTEXT NOT NULL,
    `size` TINYTEXT NOT NULL,
    `magnet` MEDIUMTEXT NOT NULL,
    `fansubId` INTEGER NULL,
    `publisherId` INTEGER NOT NULL,
    `createdAt` BIGINT NOT NULL,

    INDEX `Resource_createdAt_idx`(`createdAt` DESC),
    PRIMARY KEY (`href`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Anitomy` (
    `href` VARCHAR(600) NOT NULL,
    `title` TINYTEXT NOT NULL,
    `episode` INTEGER NULL,
    `type` TINYTEXT NULL,
    `meta` JSON NULL,

    PRIMARY KEY (`href`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Resource` ADD CONSTRAINT `Resource_fansubId_fkey` FOREIGN KEY (`fansubId`) REFERENCES `Team`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Resource` ADD CONSTRAINT `Resource_publisherId_fkey` FOREIGN KEY (`publisherId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Anitomy` ADD CONSTRAINT `Anitomy_href_fkey` FOREIGN KEY (`href`) REFERENCES `Resource`(`href`) ON DELETE RESTRICT ON UPDATE CASCADE;
