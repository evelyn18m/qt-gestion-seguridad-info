import { PrismaService } from '../prisma/prisma.service';
import { CreateCatalogoDto } from './dto/create-catalogo.dto';
import { UpdateCatalogoDto } from './dto/update-catalogo.dto';
export declare class CatalogosService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private delegate;
    findAll(tipo: string): Promise<unknown[]>;
    findOne(tipo: string, id: number): Promise<{}>;
    create(tipo: string, dto: CreateCatalogoDto): Promise<unknown>;
    update(tipo: string, id: number, dto: UpdateCatalogoDto): Promise<unknown>;
    remove(tipo: string, id: number): Promise<unknown>;
    getTipos(): {
        tipo: string;
        modelo: string;
    }[];
}
