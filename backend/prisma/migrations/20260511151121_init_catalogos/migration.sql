-- CreateTable
CREATE TABLE `Amenaza`
(
    `id`         INTEGER      NOT NULL AUTO_INCREMENT,
    `categoria`  VARCHAR(191) NOT NULL,
    `nombre`     TEXT         NOT NULL,
    `tipoFuente` VARCHAR(191) NULL,
    `createdAt`  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt`  DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Vulnerabilidad`
(
    `id`          INTEGER      NOT NULL AUTO_INCREMENT,
    `categoria`   VARCHAR(191) NOT NULL,
    `descripcion` TEXT         NOT NULL,
    `createdAt`   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt`   DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Impacto`
(
    `id`        INTEGER      NOT NULL AUTO_INCREMENT,
    `tipo`      VARCHAR(191) NOT NULL,
    `nivel`     VARCHAR(191) NOT NULL,
    `valor`     INTEGER      NOT NULL,
    `criterio`  TEXT         NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Formato`
(
    `id`        INTEGER      NOT NULL AUTO_INCREMENT,
    `nombre`    VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Subproceso`
(
    `id`        INTEGER NOT NULL AUTO_INCREMENT,
    `nombre`    TEXT    NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MacroProceso`
(
    `id`        INTEGER NOT NULL AUTO_INCREMENT,
    `nombre`    TEXT    NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TipoActivo`
(
    `id`        INTEGER      NOT NULL AUTO_INCREMENT,
    `nombre`    VARCHAR(191) NOT NULL,
    `detalle`   TEXT         NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Valoracion`
(
    `id`        INTEGER      NOT NULL AUTO_INCREMENT,
    `nombre`    VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
