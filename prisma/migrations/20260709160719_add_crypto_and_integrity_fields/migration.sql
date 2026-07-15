-- AlterTable
ALTER TABLE `Data` ADD COLUMN `firmaGateway` TEXT NULL,
    ADD COLUMN `hash` VARCHAR(64) NULL,
    ADD COLUMN `prevHash` VARCHAR(64) NULL;

-- AlterTable
ALTER TABLE `Gateway` ADD COLUMN `publicKeyPem` TEXT NULL;
