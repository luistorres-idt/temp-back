/*
  Warnings:

  - A unique constraint covering the columns `[identificador]` on the table `Dispositivo` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[identificador]` on the table `Gateway` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `Dispositivo_identificador_key` ON `Dispositivo`(`identificador`);

-- CreateIndex
CREATE UNIQUE INDEX `Gateway_identificador_key` ON `Gateway`(`identificador`);
