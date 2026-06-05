/*
  Warnings:

  - You are about to alter the column `horaReporte` on the `Cliente` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Int`.
  - A unique constraint covering the columns `[tokenHash]` on the table `Gateway` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `Cliente` MODIFY `horaReporte` INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `Gateway` ADD COLUMN `tokenHash` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `Data_idDispositivo_creado_idx` ON `Data`(`idDispositivo`, `creado`);

-- CreateIndex
CREATE UNIQUE INDEX `Gateway_tokenHash_key` ON `Gateway`(`tokenHash`);

-- CreateIndex
CREATE INDEX `InfoEstatus_idDispositivo_creado_idx` ON `InfoEstatus`(`idDispositivo`, `creado`);
