-- CreateTable
CREATE TABLE `Anitomy` (
    `href` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `episode` INTEGER NULL,
    `type` VARCHAR(191) NULL,
    `meta` JSON NULL,

    PRIMARY KEY (`href`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Resource_createdAt_idx` ON `Resource`(`createdAt` DESC);

-- AddForeignKey
ALTER TABLE `Anitomy` ADD CONSTRAINT `Anitomy_href_fkey` FOREIGN KEY (`href`) REFERENCES `Resource`(`href`) ON DELETE RESTRICT ON UPDATE CASCADE;
