-- CreateTable Riesgo
CREATE TABLE `Riesgo`
(
    `id`        INTEGER NOT NULL AUTO_INCREMENT,
    `tipo`      VARCHAR(191) NOT NULL,
    `nivel`     VARCHAR(191) NOT NULL,
    `valor`     INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable FuncionarioArea
CREATE TABLE `FuncionarioArea`
(
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `funcionarioId` INTEGER NOT NULL,
    `areaId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`),
    FOREIGN KEY (`funcionarioId`) REFERENCES `Funcionario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (`areaId`) REFERENCES `Area`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
