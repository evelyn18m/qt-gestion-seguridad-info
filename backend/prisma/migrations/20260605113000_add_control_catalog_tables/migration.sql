-- CreateTable
CREATE TABLE `CategoriaControlesImplementar`
(
    `id`     INTEGER      NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ControlesImplementar`
(
    `id`          INTEGER      NOT NULL AUTO_INCREMENT,
    `seccion`     VARCHAR(191) NOT NULL,
    `descripcion` VARCHAR(191) NOT NULL,
    `categoriaId` INTEGER      NOT NULL,

    UNIQUE INDEX `ControlesImplementar_seccion_key` (`seccion`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ControlesImplementar`
    ADD CONSTRAINT `ControlesImplementar_categoriaId_fkey`
        FOREIGN KEY (`categoriaId`) REFERENCES `CategoriaControlesImplementar` (`id`)
            ON DELETE RESTRICT ON UPDATE CASCADE;
