/*
  Warnings:

  - Added the required column `identificador` to the `Dispositivo` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nombre` to the `Gateway` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Dispositivo` ADD COLUMN `identificador` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `Gateway` ADD COLUMN `nombre` VARCHAR(191) NOT NULL;
