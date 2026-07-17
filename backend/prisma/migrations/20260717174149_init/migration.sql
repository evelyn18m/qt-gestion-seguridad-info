-- CreateTable
CREATE TABLE `Amenaza` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `categoria` VARCHAR(191) NOT NULL,
    `nombre` TEXT NOT NULL,
    `tipoFuente` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Vulnerabilidad` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `categoria` VARCHAR(191) NOT NULL,
    `descripcion` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Impacto` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tipo` VARCHAR(191) NOT NULL,
    `nivel` VARCHAR(191) NOT NULL,
    `valor` INTEGER NOT NULL,
    `criterio` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Formato` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Subproceso` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` TEXT NOT NULL,
    `macroProcesoId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MacroProceso` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` TEXT NOT NULL,
    `codigo` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TipoActivo` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `detalle` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TipoDatosPersonales` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `TipoDatosPersonales_nombre_key`(`nombre`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Valoracion` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Funcionario` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `areaId` INTEGER NULL,
    `nombre` TEXT NOT NULL,
    `correo` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Area` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ValoracionActivo` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombreActivo` TEXT NOT NULL,
    `tipoActivoId` INTEGER NOT NULL,
    `formatoId` INTEGER NOT NULL,
    `macroProcesoId` INTEGER NOT NULL,
    `subProcesoId` INTEGER NOT NULL,
    `propietarioId` INTEGER NOT NULL,
    `custodioId` TEXT NOT NULL,
    `descripcion` TEXT NOT NULL,
    `controlSeguridad` TEXT NOT NULL,
    `ubicacion` TEXT NOT NULL,
    `observaciones` TEXT NULL,
    `confidencialidadId` INTEGER NOT NULL,
    `integridadId` INTEGER NOT NULL,
    `disponibilidadId` INTEGER NOT NULL,
    `tieneDatosPersonales` BOOLEAN NOT NULL DEFAULT false,
    `tiposDatosPersonales` TEXT NULL,
    `amenazas` TEXT NULL,
    `vulnerabilidades` TEXT NULL,
    `controlesImplementacion` TEXT NULL,
    `impacto` DOUBLE NULL,
    `probabilidadId` INTEGER NULL,
    `amenazaRiesgoId` INTEGER NULL,
    `vulnerabilidadRiesgoId` INTEGER NULL,
    `controlesArea` TEXT NULL,
    `evaluacionRiesgo` DOUBLE NULL,
    `nivelRiesgo` VARCHAR(191) NULL,
    `metodoTratamiento` TEXT NULL,
    `tipoControl` INTEGER NULL,
    `controlesImplementar` TEXT NULL,
    `nivelAmenazaControl` INTEGER NULL,
    `nivelVulnerabilidadControl` INTEGER NULL,
    `evaluacionRiesgoControl` DOUBLE NULL,
    `nivelRiesgoControl` VARCHAR(191) NULL,
    `createdBy` VARCHAR(191) NULL,
    `updatedBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `accion` VARCHAR(191) NOT NULL,
    `modulo` VARCHAR(191) NOT NULL,
    `entidad` VARCHAR(191) NULL,
    `usuarioId` VARCHAR(191) NULL,
    `usuario` VARCHAR(191) NULL,
    `detalle` TEXT NULL,
    `ip` VARCHAR(191) NULL,
    `dispositivo` VARCHAR(191) NULL,
    `path` VARCHAR(191) NULL,
    `metodo` VARCHAR(191) NULL,
    `status` INTEGER NULL,
    `duracionMs` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
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
    `tipoControlId` INTEGER NOT NULL,
    `riesgoControlId` INTEGER NULL,
    `vulnerabilidadControlId` INTEGER NULL,
    `evaluacionRiesgoControl` DOUBLE NULL,
    `nivelRiesgoControl` VARCHAR(191) NULL,
    `riesgoResidual` VARCHAR(191) NULL,
    `amenazaIds` TEXT NULL,
    `vulnerabilidadIds` TEXT NULL,
    `controlesImplementados` TEXT NULL,
    `controlesArea` TEXT NULL,
    `controlesImplementarId` TEXT NULL,
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
    `valor` INTEGER NOT NULL DEFAULT 1,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Riesgo` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tipo` VARCHAR(191) NOT NULL,
    `nivel` VARCHAR(191) NOT NULL,
    `valor` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CategoriaControlesImplementar` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ConfiguracionRiesgo` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `riesgoBajoMax` INTEGER NOT NULL DEFAULT 3,
    `riesgoBajoDesde` INTEGER NOT NULL DEFAULT 1,
    `riesgoMedioMax` INTEGER NOT NULL DEFAULT 9,
    `riesgoMedioDesde` INTEGER NOT NULL DEFAULT 3,
    `riesgoAltoMax` INTEGER NOT NULL DEFAULT 27,
    `riesgoAltoDesde` INTEGER NOT NULL DEFAULT 9,
    `controlBajoMax` INTEGER NOT NULL DEFAULT 3,
    `controlBajoDesde` INTEGER NOT NULL DEFAULT 1,
    `controlMedioMax` INTEGER NOT NULL DEFAULT 9,
    `controlMedioDesde` INTEGER NOT NULL DEFAULT 3,
    `controlAltoMax` INTEGER NOT NULL DEFAULT 27,
    `controlAltoDesde` INTEGER NOT NULL DEFAULT 9,
    `residualAceptableMax` INTEGER NOT NULL DEFAULT 3,
    `residualAceptableDesde` INTEGER NOT NULL DEFAULT 1,
    `residualInaceptableDesde` INTEGER NOT NULL DEFAULT 3,
    `residualInaceptableMax` INTEGER NOT NULL DEFAULT 27,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ControlesImplementar` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `seccion` VARCHAR(191) NOT NULL,
    `descripcion` VARCHAR(191) NOT NULL,
    `categoriaId` INTEGER NOT NULL,

    UNIQUE INDEX `ControlesImplementar_seccion_key`(`seccion`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OpcionTratamiento` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EstadoPlanTratamiento` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PlazoImplementacion` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `codigo` VARCHAR(191) NOT NULL,
    `nombre` TEXT NOT NULL,

    UNIQUE INDEX `PlazoImplementacion_codigo_key`(`codigo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PlanTratamiento` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tipoActivoId` INTEGER NOT NULL,
    `nivelRiesgoId` INTEGER NOT NULL,
    `opcionTratamientoId` INTEGER NOT NULL,
    `controlesImplementarId` TEXT NOT NULL,
    `descripcionActividades` TEXT NOT NULL,
    `responsableImplementacionId` TEXT NOT NULL,
    `areaFuncionalId` INTEGER NULL,
    `plazoImplementacionId` INTEGER NULL,
    `fechaInicioImplementacion` DATETIME(3) NULL,
    `fechaFinImplementacion` DATETIME(3) NULL,
    `horaDia` INTEGER NOT NULL,
    `montoUSD` VARCHAR(191) NOT NULL,
    `estadoId` INTEGER NOT NULL,
    `observaciones` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Usuario` (
    `id` VARCHAR(191) NOT NULL,
    `keycloakSub` VARCHAR(191) NULL,
    `username` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL DEFAULT '',
    `passwordHash` VARCHAR(191) NULL,
    `primerInicio` BOOLEAN NOT NULL DEFAULT true,
    `habilitado` BOOLEAN NOT NULL DEFAULT true,
    `roles` VARCHAR(191) NOT NULL DEFAULT '[]',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Usuario_keycloakSub_key`(`keycloakSub`),
    UNIQUE INDEX `Usuario_username_key`(`username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Subproceso` ADD CONSTRAINT `Subproceso_macroProcesoId_fkey` FOREIGN KEY (`macroProcesoId`) REFERENCES `MacroProceso`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Funcionario` ADD CONSTRAINT `Funcionario_areaId_fkey` FOREIGN KEY (`areaId`) REFERENCES `Area`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ControlesImplementar` ADD CONSTRAINT `ControlesImplementar_categoriaId_fkey` FOREIGN KEY (`categoriaId`) REFERENCES `CategoriaControlesImplementar`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlanTratamiento` ADD CONSTRAINT `PlanTratamiento_tipoActivoId_fkey` FOREIGN KEY (`tipoActivoId`) REFERENCES `TipoActivo`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlanTratamiento` ADD CONSTRAINT `PlanTratamiento_nivelRiesgoId_fkey` FOREIGN KEY (`nivelRiesgoId`) REFERENCES `Riesgo`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlanTratamiento` ADD CONSTRAINT `PlanTratamiento_opcionTratamientoId_fkey` FOREIGN KEY (`opcionTratamientoId`) REFERENCES `OpcionTratamiento`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlanTratamiento` ADD CONSTRAINT `PlanTratamiento_areaFuncionalId_fkey` FOREIGN KEY (`areaFuncionalId`) REFERENCES `Area`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlanTratamiento` ADD CONSTRAINT `PlanTratamiento_plazoImplementacionId_fkey` FOREIGN KEY (`plazoImplementacionId`) REFERENCES `PlazoImplementacion`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlanTratamiento` ADD CONSTRAINT `PlanTratamiento_estadoId_fkey` FOREIGN KEY (`estadoId`) REFERENCES `EstadoPlanTratamiento`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
