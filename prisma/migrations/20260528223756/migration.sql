/*
  Warnings:

  - You are about to alter the column `horaReporte` on the `cliente` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Int`.

*/
-- AlterTable
ALTER TABLE `cliente` MODIFY `horaReporte` INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX `Data_idDispositivo_creado_idx` ON `Data`(`idDispositivo`, `creado`);

-- CreateIndex
CREATE INDEX `InfoEstatus_idDispositivo_creado_idx` ON `InfoEstatus`(`idDispositivo`, `creado`);
