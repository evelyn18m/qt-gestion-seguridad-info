"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CatalogosService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const TIPO_MAP = {
    amenazas: 'amenaza',
    vulnerabilidades: 'vulnerabilidad',
    impactos: 'impacto',
    formatos: 'formato',
    subprocesos: 'subproceso',
    macroprocesos: 'macroProceso',
    'tipos-activo': 'tipoActivo',
    valoraciones: 'valoracion',
    funcionarios: 'funcionario',
    areas: 'area',
    'tipos-control': 'tipoControl',
    riesgos: 'riesgo',
    probabilidades: 'probabilidad',
};
const FIELD_MAP = {
    amenaza: ['categoria', 'nombre', 'tipoFuente'],
    vulnerabilidad: ['categoria', 'descripcion'],
    impacto: ['tipo', 'nivel', 'valor', 'criterio'],
    formato: ['nombre'],
    subproceso: ['nombre'],
    macroProceso: ['nombre'],
    tipoActivo: ['nombre', 'detalle'],
    valoracion: ['nombre'],
    funcionario: ['nombre'],
    area: ['nombre'],
    tipoControl: ['nombre'],
    riesgo: ['evaluacion', 'valor'],
    probabilidad: ['nombre'],
};
let CatalogosService = class CatalogosService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    delegate(model) {
        const key = (model.charAt(0).toLowerCase() +
            model.slice(1));
        return this.prisma[key];
    }
    findAll(tipo) {
        const model = TIPO_MAP[tipo];
        if (!model)
            throw new common_1.BadRequestException(`Tipo inválido: ${tipo}`);
        return this.delegate(model).findMany({ orderBy: { id: 'asc' } });
    }
    async findOne(tipo, id) {
        const model = TIPO_MAP[tipo];
        if (!model)
            throw new common_1.BadRequestException(`Tipo inválido: ${tipo}`);
        const delegate = this.delegate(model);
        const item = await delegate.findUnique({ where: { id } });
        if (!item)
            throw new common_1.NotFoundException(`${model} con id ${id} no encontrado`);
        return item;
    }
    create(tipo, dto) {
        const model = TIPO_MAP[tipo];
        if (!model)
            throw new common_1.BadRequestException(`Tipo inválido: ${tipo}`);
        const fields = FIELD_MAP[model];
        const data = {};
        for (const field of fields) {
            const val = dto[field];
            if (val !== undefined)
                data[field] = val;
        }
        if (Object.keys(data).length === 0) {
            throw new common_1.BadRequestException(`No se proporcionaron campos válidos para ${model}. Campos: ${fields.join(', ')}`);
        }
        return this.delegate(model).create({ data });
    }
    async update(tipo, id, dto) {
        const model = TIPO_MAP[tipo];
        if (!model)
            throw new common_1.BadRequestException(`Tipo inválido: ${tipo}`);
        await this.findOne(tipo, id);
        const fields = FIELD_MAP[model];
        const data = {};
        for (const field of fields) {
            const val = dto[field];
            if (val !== undefined)
                data[field] = val;
        }
        if (Object.keys(data).length === 0) {
            throw new common_1.BadRequestException(`No se proporcionaron campos válidos para actualizar ${model}`);
        }
        return this.delegate(model).update({ where: { id }, data });
    }
    async remove(tipo, id) {
        const model = TIPO_MAP[tipo];
        if (!model)
            throw new common_1.BadRequestException(`Tipo inválido: ${tipo}`);
        await this.findOne(tipo, id);
        return this.delegate(model).delete({ where: { id } });
    }
    getTipos() {
        return Object.keys(TIPO_MAP).map((key) => ({
            tipo: key,
            modelo: TIPO_MAP[key],
        }));
    }
};
exports.CatalogosService = CatalogosService;
exports.CatalogosService = CatalogosService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CatalogosService);
//# sourceMappingURL=catalogos.service.js.map