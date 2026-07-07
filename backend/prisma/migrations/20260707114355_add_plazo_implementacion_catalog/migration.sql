-- CreateTable
CREATE TABLE `PlazoImplementacion` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `codigo` VARCHAR(191) NOT NULL,
    `nombre` TEXT NOT NULL,

    UNIQUE INDEX `PlazoImplementacion_codigo_key`(`codigo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable
ALTER TABLE `PlanTratamiento` DROP COLUMN `plazoImplementacion`,
    ADD COLUMN `plazoImplementacionId` INTEGER NULL,
    ADD COLUMN `fechaInicioImplementacion` DATETIME(3) NULL,
    ADD COLUMN `fechaFinImplementacion` DATETIME(3) NULL;

-- AddForeignKey
ALTER TABLE `PlanTratamiento` ADD CONSTRAINT `PlanTratamiento_plazoImplementacionId_fkey` FOREIGN KEY (`plazoImplementacionId`) REFERENCES `PlazoImplementacion`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
