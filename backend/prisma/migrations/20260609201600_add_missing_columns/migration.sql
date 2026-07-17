-- Add missing columns to Subproceso
ALTER TABLE `Subproceso` ADD COLUMN `macroProcesoId` INTEGER NOT NULL DEFAULT 1;
ALTER TABLE `Subproceso` ADD FOREIGN KEY (`macroProcesoId`) REFERENCES `MacroProceso`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add missing columns to ValoracionActivo
ALTER TABLE `ValoracionActivo` ADD COLUMN `amenazas` TEXT NULL;
ALTER TABLE `ValoracionActivo` ADD COLUMN `vulnerabilidades` TEXT NULL;
ALTER TABLE `ValoracionActivo` ADD COLUMN `controlesImplementacion` TEXT NULL;
ALTER TABLE `ValoracionActivo` ADD COLUMN `impacto` DOUBLE NULL;
ALTER TABLE `ValoracionActivo` ADD COLUMN `probabilidadId` INTEGER NULL;
ALTER TABLE `ValoracionActivo` ADD COLUMN `amenazaRiesgoId` INTEGER NULL;
ALTER TABLE `ValoracionActivo` ADD COLUMN `vulnerabilidadRiesgoId` INTEGER NULL;
ALTER TABLE `ValoracionActivo` ADD COLUMN `controlesArea` TEXT NULL;
ALTER TABLE `ValoracionActivo` ADD COLUMN `evaluacionRiesgo` DOUBLE NULL;
ALTER TABLE `ValoracionActivo` ADD COLUMN `nivelRiesgo` VARCHAR(191) NULL;
ALTER TABLE `ValoracionActivo` ADD COLUMN `metodoTratamiento` TEXT NULL;
ALTER TABLE `ValoracionActivo` ADD COLUMN `tipoControl` INTEGER NULL;
ALTER TABLE `ValoracionActivo` ADD COLUMN `controlesImplementar` TEXT NULL;
ALTER TABLE `ValoracionActivo` ADD COLUMN `nivelAmenazaControl` INTEGER NULL;
ALTER TABLE `ValoracionActivo` ADD COLUMN `nivelVulnerabilidadControl` INTEGER NULL;
ALTER TABLE `ValoracionActivo` ADD COLUMN `evaluacionRiesgoControl` DOUBLE NULL;
ALTER TABLE `ValoracionActivo` ADD COLUMN `nivelRiesgoControl` VARCHAR(191) NULL;

-- Recreate DetalleRiesgo table with correct foreign key
DROP TABLE IF EXISTS `DetalleRiesgo`;
CREATE TABLE `DetalleRiesgo` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `valoracionActivoId` INTEGER NOT NULL,
  `tipo` VARCHAR(191) NOT NULL,
  `catalogoId` INTEGER NOT NULL,
  `riesgoId` INTEGER NULL,
  `vulnerabilidadRiesgoId` INTEGER NULL,
  `evaluacionRiesgo` DOUBLE NULL,
  `nivelRiesgo` VARCHAR(191) NULL,
  `metodoTratamiento` TEXT NULL,
  `tipoControlId` INTEGER NULL,
  `riesgoControlId` INTEGER NULL,
  `vulnerabilidadControlId` INTEGER NULL,
  `evaluacionRiesgoControl` DOUBLE NULL,
  `nivelRiesgoControl` VARCHAR(191) NULL,
  `riesgoResidual` VARCHAR(191) NULL,
  `amenazaIds` TEXT NULL,
  `vulnerabilidadIds` TEXT NULL,
  `controlesImplementados` TEXT NULL,
  `controlesArea` TEXT NULL,
  `controlesImplementarId` INTEGER NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`controlesImplementarId`) REFERENCES `ControlesImplementar`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
