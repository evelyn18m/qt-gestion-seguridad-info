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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CatalogosController = void 0;
const common_1 = require("@nestjs/common");
const catalogos_service_1 = require("./catalogos.service");
const create_catalogo_dto_1 = require("./dto/create-catalogo.dto");
const update_catalogo_dto_1 = require("./dto/update-catalogo.dto");
let CatalogosController = class CatalogosController {
    catalogosService;
    constructor(catalogosService) {
        this.catalogosService = catalogosService;
    }
    getTipos() {
        return this.catalogosService.getTipos();
    }
    findAll(tipo) {
        return this.catalogosService.findAll(tipo);
    }
    findOne(tipo, id) {
        return this.catalogosService.findOne(tipo, id);
    }
    create(tipo, dto) {
        return this.catalogosService.create(tipo, dto);
    }
    update(tipo, id, dto) {
        return this.catalogosService.update(tipo, id, dto);
    }
    remove(tipo, id) {
        return this.catalogosService.remove(tipo, id);
    }
};
exports.CatalogosController = CatalogosController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CatalogosController.prototype, "getTipos", null);
__decorate([
    (0, common_1.Get)(':tipo'),
    __param(0, (0, common_1.Param)('tipo')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CatalogosController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':tipo/:id'),
    __param(0, (0, common_1.Param)('tipo')),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number]),
    __metadata("design:returntype", void 0)
], CatalogosController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(':tipo'),
    __param(0, (0, common_1.Param)('tipo')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_catalogo_dto_1.CreateCatalogoDto]),
    __metadata("design:returntype", void 0)
], CatalogosController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':tipo/:id'),
    __param(0, (0, common_1.Param)('tipo')),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, update_catalogo_dto_1.UpdateCatalogoDto]),
    __metadata("design:returntype", void 0)
], CatalogosController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':tipo/:id'),
    __param(0, (0, common_1.Param)('tipo')),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number]),
    __metadata("design:returntype", void 0)
], CatalogosController.prototype, "remove", null);
exports.CatalogosController = CatalogosController = __decorate([
    (0, common_1.Controller)('catalogos'),
    __metadata("design:paramtypes", [catalogos_service_1.CatalogosService])
], CatalogosController);
//# sourceMappingURL=catalogos.controller.js.map