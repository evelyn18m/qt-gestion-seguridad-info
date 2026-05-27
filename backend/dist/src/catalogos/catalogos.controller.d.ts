import { CatalogosService } from './catalogos.service';
import { CreateCatalogoDto } from './dto/create-catalogo.dto';
import { UpdateCatalogoDto } from './dto/update-catalogo.dto';
export declare class CatalogosController {
    private readonly catalogosService;
    constructor(catalogosService: CatalogosService);
    getTipos(): {
        tipo: string;
        modelo: string;
    }[];
    findAll(tipo: string): Promise<unknown[]>;
    findOne(tipo: string, id: number): Promise<{}>;
    create(tipo: string, dto: CreateCatalogoDto): Promise<unknown>;
    update(tipo: string, id: number, dto: UpdateCatalogoDto): Promise<unknown>;
    remove(tipo: string, id: number): Promise<unknown>;
}
