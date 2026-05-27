"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateValoracionDto = exports.DetalleRiesgoDto = void 0;
class DetalleRiesgoDto {
    id;
    tipo;
    catalogoId;
    riesgoId;
    evaluacionRiesgo;
    nivelRiesgo;
    metodoTratamiento;
    tipoControlId;
    riesgoControlId;
    evaluacionRiesgoControl;
    nivelRiesgoControl;
}
exports.DetalleRiesgoDto = DetalleRiesgoDto;
class CreateValoracionDto {
    nombreActivo;
    tipoActivoId;
    formatoId;
    macroProcesoId;
    subProcesoId;
    propietarioId;
    custodioId;
    descripcion;
    controlSeguridad;
    ubicacion;
    observaciones;
    confidencialidadId;
    integridadId;
    disponibilidadId;
    tieneDatosPersonales;
    amenazas;
    vulnerabilidades;
    controlesImplementacion;
    impacto;
    probabilidadId;
    amenazaRiesgoId;
    vulnerabilidadRiesgoId;
    controlesArea;
    evaluacionRiesgo;
    nivelRiesgo;
    metodoTratamiento;
    tipoControl;
    controlesImplementar;
    nivelAmenazaControl;
    nivelVulnerabilidadControl;
    evaluacionRiesgoControl;
    nivelRiesgoControl;
    detallesRiesgo;
}
exports.CreateValoracionDto = CreateValoracionDto;
//# sourceMappingURL=create-valoracion.dto.js.map