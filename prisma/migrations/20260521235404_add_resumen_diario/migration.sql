-- CreateTable
CREATE TABLE `ResumenDiario` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `fecha` DATETIME(3) NOT NULL,
    `tempMax` DOUBLE NOT NULL,
    `tempMin` DOUBLE NOT NULL,
    `tempMedia` DOUBLE NOT NULL,
    `tempMediana` DOUBLE NOT NULL,
    `totalLecturas` INTEGER NOT NULL,
    `creado` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizado` DATETIME(3) NOT NULL,
    `idSucursal` INTEGER NOT NULL,

    UNIQUE INDEX `ResumenDiario_idSucursal_fecha_key`(`idSucursal`, `fecha`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ResumenDiario` ADD CONSTRAINT `ResumenDiario_idSucursal_fkey` FOREIGN KEY (`idSucursal`) REFERENCES `Sucursal`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
