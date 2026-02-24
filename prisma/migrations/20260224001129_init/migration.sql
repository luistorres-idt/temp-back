-- CreateTable
CREATE TABLE `Accion` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `creado` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizado` DATETIME(3) NOT NULL,
    `estatus` BOOLEAN NOT NULL DEFAULT true,
    `moduloId` INTEGER NOT NULL,
    `operacionId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Modulo` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `creado` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizado` DATETIME(3) NOT NULL,
    `estatus` BOOLEAN NOT NULL DEFAULT true,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Operacion` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `creado` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizado` DATETIME(3) NOT NULL,
    `estatus` BOOLEAN NOT NULL DEFAULT true,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Permiso` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `creado` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizado` DATETIME(3) NOT NULL,
    `estatus` BOOLEAN NOT NULL DEFAULT true,
    `idPerfil` INTEGER NOT NULL,
    `idAccion` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Perfil` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `creado` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizado` DATETIME(3) NOT NULL,
    `estatus` BOOLEAN NOT NULL DEFAULT true,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Usuario` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `apellido` VARCHAR(191) NOT NULL,
    `correo` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `idPerfil` INTEGER NOT NULL,
    `creado` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizado` DATETIME(3) NOT NULL,
    `estatus` BOOLEAN NOT NULL DEFAULT true,
    `idCliente` INTEGER NULL,
    `idSucursal` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Cliente` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `creado` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizado` DATETIME(3) NOT NULL,
    `estatus` BOOLEAN NOT NULL DEFAULT true,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Sucursal` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `creado` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizado` DATETIME(3) NOT NULL,
    `estatus` BOOLEAN NOT NULL DEFAULT true,
    `idCliente` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Seccion` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `creado` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizado` DATETIME(3) NOT NULL,
    `estatus` BOOLEAN NOT NULL DEFAULT true,
    `idSucursal` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Congelador` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `creado` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizado` DATETIME(3) NOT NULL,
    `estatus` BOOLEAN NOT NULL DEFAULT true,
    `idSeccion` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Gateway` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `identificador` VARCHAR(191) NOT NULL,
    `creado` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizado` DATETIME(3) NOT NULL,
    `estatus` BOOLEAN NOT NULL DEFAULT true,
    `idSeccion` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Dispositivo` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `creado` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizado` DATETIME(3) NOT NULL,
    `estatus` BOOLEAN NOT NULL DEFAULT true,
    `idGateway` INTEGER NOT NULL,
    `idCongelador` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Data` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `temperatura` DOUBLE NOT NULL,
    `ambiente` DOUBLE NOT NULL,
    `creado` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizado` DATETIME(3) NOT NULL,
    `estatus` BOOLEAN NOT NULL DEFAULT true,
    `idDispositivo` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InfoEstatus` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `bateria` DOUBLE NOT NULL,
    `rssi` INTEGER NOT NULL,
    `snr` INTEGER NOT NULL,
    `creado` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizado` DATETIME(3) NOT NULL,
    `estatus` BOOLEAN NOT NULL DEFAULT true,
    `idGateway` INTEGER NOT NULL,
    `idDispositivo` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Accion` ADD CONSTRAINT `Accion_moduloId_fkey` FOREIGN KEY (`moduloId`) REFERENCES `Modulo`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Accion` ADD CONSTRAINT `Accion_operacionId_fkey` FOREIGN KEY (`operacionId`) REFERENCES `Operacion`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Permiso` ADD CONSTRAINT `Permiso_idPerfil_fkey` FOREIGN KEY (`idPerfil`) REFERENCES `Perfil`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Permiso` ADD CONSTRAINT `Permiso_idAccion_fkey` FOREIGN KEY (`idAccion`) REFERENCES `Accion`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Usuario` ADD CONSTRAINT `Usuario_idPerfil_fkey` FOREIGN KEY (`idPerfil`) REFERENCES `Perfil`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Usuario` ADD CONSTRAINT `Usuario_idCliente_fkey` FOREIGN KEY (`idCliente`) REFERENCES `Cliente`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Usuario` ADD CONSTRAINT `Usuario_idSucursal_fkey` FOREIGN KEY (`idSucursal`) REFERENCES `Sucursal`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Sucursal` ADD CONSTRAINT `Sucursal_idCliente_fkey` FOREIGN KEY (`idCliente`) REFERENCES `Cliente`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Seccion` ADD CONSTRAINT `Seccion_idSucursal_fkey` FOREIGN KEY (`idSucursal`) REFERENCES `Sucursal`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Congelador` ADD CONSTRAINT `Congelador_idSeccion_fkey` FOREIGN KEY (`idSeccion`) REFERENCES `Seccion`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Gateway` ADD CONSTRAINT `Gateway_idSeccion_fkey` FOREIGN KEY (`idSeccion`) REFERENCES `Seccion`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Dispositivo` ADD CONSTRAINT `Dispositivo_idGateway_fkey` FOREIGN KEY (`idGateway`) REFERENCES `Gateway`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Dispositivo` ADD CONSTRAINT `Dispositivo_idCongelador_fkey` FOREIGN KEY (`idCongelador`) REFERENCES `Congelador`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Data` ADD CONSTRAINT `Data_idDispositivo_fkey` FOREIGN KEY (`idDispositivo`) REFERENCES `Dispositivo`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InfoEstatus` ADD CONSTRAINT `InfoEstatus_idGateway_fkey` FOREIGN KEY (`idGateway`) REFERENCES `Gateway`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InfoEstatus` ADD CONSTRAINT `InfoEstatus_idDispositivo_fkey` FOREIGN KEY (`idDispositivo`) REFERENCES `Dispositivo`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
