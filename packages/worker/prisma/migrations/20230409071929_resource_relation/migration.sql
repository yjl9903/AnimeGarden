/*
  Warnings:

  - You are about to drop the column `teamId` on the `Resource` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Resource` table. All the data in the column will be lost.
  - Added the required column `publisherId` to the `Resource` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `Resource` DROP FOREIGN KEY `Resource_teamId_fkey`;

-- DropForeignKey
ALTER TABLE `Resource` DROP FOREIGN KEY `Resource_userId_fkey`;

-- AlterTable
ALTER TABLE `Resource` DROP COLUMN `teamId`,
    DROP COLUMN `userId`,
    ADD COLUMN `fansubId` INTEGER NULL,
    ADD COLUMN `publisherId` INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE `Resource` ADD CONSTRAINT `Resource_fansubId_fkey` FOREIGN KEY (`fansubId`) REFERENCES `Team`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Resource` ADD CONSTRAINT `Resource_publisherId_fkey` FOREIGN KEY (`publisherId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
