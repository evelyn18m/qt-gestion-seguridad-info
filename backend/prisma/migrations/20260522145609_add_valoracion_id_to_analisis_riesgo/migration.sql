-- CreateTable
CREATE TABLE `ValoracionActivo` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombreActivo` TEXT NOT NULL,
    `tipoActivoId` INTEGER NOT NULL,
    `formatoId` INTEGER NOT NULL,
    `macroProcesoId` INTEGER NOT NULL,
    `subProcesoId` INTEGER NOT NULL,
    `propietarioId` INTEGER NOT NULL,
    `custodioId` INTEGER NOT NULL,
    `descripcion` TEXT NOT NULL,
    `controlSeguridad` TEXT NOT NULL,
    `ubicacion` TEXT NOT NULL,
    `observaciones` TEXT NULL,
    `confidencialidadId` INTEGER NOT NULL,
    `integridadId` INTEGER NOT NULL,
    `disponibilidadId` INTEGER NOT NULL,
    `tieneDatosPersonales` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TipoControl` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Probabilidad` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Riesgo` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `evaluacion` TEXT NOT NULL,
    `valor` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AnalisisRiesgo` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `valoracionId` INTEGER NULL,
    `macroProcesoId` INTEGER NOT NULL,
    `nombreActivo` TEXT NOT NULL,
    `amenazas` TEXT NOT NULL,
    `vulnerabilidades` TEXT NOT NULL,
    `controlesImplementacion` TEXT NOT NULL,
    `impacto` DOUBLE NOT NULL,
    `probabilidadId` INTEGER NOT NULL,
    `amenazaRiesgoId` INTEGER NULL,
    `vulnerabilidadRiesgoId` INTEGER NULL,
    `controlesArea` TEXT NOT NULL,
    `nivelRiesgo` VARCHAR(191) NOT NULL,
    `descripcion` TEXT NULL,
    `metodoTratamiento` TEXT NULL,
    `tipoControl` INTEGER NULL,
    `controlesImplementar` TEXT NULL,
    `nivelAmenazaControl` INTEGER NULL,
    `nivelVulnerabilidadControl` INTEGER NULL,
    `evaluacionRiesgoControl` DOUBLE NULL,
    `nivelRiesgoControl` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
