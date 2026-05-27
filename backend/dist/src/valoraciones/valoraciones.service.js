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
exports.ValoracionesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let ValoracionesService = class ValoracionesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async enrich(item) {
        const [tipoActivo, formato, macroProceso, subProceso, propietario, custodio, confidencialidad, integridad, disponibilidad, tipoControl,] = await Promise.all([
            this.prisma.tipoActivo.findUnique({ where: { id: item.tipoActivoId } }),
            this.prisma.formato.findUnique({ where: { id: item.formatoId } }),
            this.prisma.macroProceso.findUnique({
                where: { id: item.macroProcesoId },
            }),
            this.prisma.subproceso.findUnique({ where: { id: item.subProcesoId } }),
            this.prisma.area.findUnique({ where: { id: item.propietarioId } }),
            this.prisma.funcionario.findUnique({ where: { id: item.custodioId } }),
            this.prisma.impacto.findUnique({
                where: { id: item.confidencialidadId },
            }),
            this.prisma.impacto.findUnique({ where: { id: item.integridadId } }),
            this.prisma.impacto.findUnique({ where: { id: item.disponibilidadId } }),
            item.tipoControl != null
                ? this.prisma.tipoControl.findUnique({
                    where: { id: item.tipoControl },
                })
                : null,
        ]);
        const detallesRiesgo = await this.prisma.detalleRiesgo.findMany({
            where: { valoracionActivoId: item.id },
            orderBy: { id: 'asc' },
        });
        return {
            ...item,
            tipoActivo,
            formato,
            macroProceso,
            subProceso,
            propietario,
            custodio,
            confidencialidad,
            integridad,
            disponibilidad,
            tipoControl,
            detallesRiesgo,
        };
    }
    async findAll() {
        const items = await this.prisma.valoracionActivo.findMany({
            orderBy: { id: 'desc' },
        });
        return Promise.all(items.map((i) => this.enrich(i)));
    }
    async findOne(id) {
        const item = await this.prisma.valoracionActivo.findUnique({
            where: { id },
        });
        if (!item)
            throw new common_1.NotFoundException(`Valoración ${id} no encontrada`);
        return this.enrich(item);
    }
    async create(dto) {
        const { detallesRiesgo, ...data } = dto;
        const item = await this.prisma.valoracionActivo.create({ data });
        if (detallesRiesgo && Array.isArray(detallesRiesgo)) {
            await this.prisma.detalleRiesgo.createMany({
                data: detallesRiesgo.map((d) => ({
                    ...d,
                    valoracionActivoId: item.id,
                })),
            });
        }
        return this.enrich(item);
    }
    async update(id, dto) {
        await this.findOne(id);
        const { detallesRiesgo, ...data } = dto;
        const item = await this.prisma.valoracionActivo.update({
            where: { id },
            data,
        });
        if (detallesRiesgo && Array.isArray(detallesRiesgo)) {
            await this.prisma.detalleRiesgo.deleteMany({
                where: { valoracionActivoId: id },
            });
            await this.prisma.detalleRiesgo.createMany({
                data: detallesRiesgo.map((d) => ({
                    ...d,
                    valoracionActivoId: id,
                })),
            });
        }
        return this.enrich(item);
    }
    async remove(id) {
        await this.findOne(id);
        await this.prisma.detalleRiesgo.deleteMany({
            where: { valoracionActivoId: id },
        });
        return this.prisma.valoracionActivo.delete({ where: { id } });
    }
};
exports.ValoracionesService = ValoracionesService;
exports.ValoracionesService = ValoracionesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ValoracionesService);
//# sourceMappingURL=valoraciones.service.js.map