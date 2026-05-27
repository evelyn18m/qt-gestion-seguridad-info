export declare class DetalleRiesgoDto {
    id?: number;
    tipo: string;
    catalogoId: number;
    riesgoId?: number;
    evaluacionRiesgo?: number;
    nivelRiesgo?: string;
    metodoTratamiento?: string;
    tipoControlId?: number;
    riesgoControlId?: number;
    evaluacionRiesgoControl?: number;
    nivelRiesgoControl?: string;
}
export declare class CreateValoracionDto {
    nombreActivo: string;
    tipoActivoId: number;
    formatoId: number;
    macroProcesoId: number;
    subProcesoId: number;
    propietarioId: number;
    custodioId: number;
    descripcion: string;
    controlSeguridad: string;
    ubicacion: string;
    observaciones?: string;
    confidencialidadId: number;
    integridadId: number;
    disponibilidadId: number;
    tieneDatosPersonales?: boolean;
    amenazas?: string;
    vulnerabilidades?: string;
    controlesImplementacion?: string;
    impacto?: number;
    probabilidadId?: number;
    amenazaRiesgoId?: number;
    vulnerabilidadRiesgoId?: number;
    controlesArea?: string;
    evaluacionRiesgo?: number;
    nivelRiesgo?: string;
    metodoTratamiento?: string;
    tipoControl?: number;
    controlesImplementar?: string;
    nivelAmenazaControl?: number;
    nivelVulnerabilidadControl?: number;
    evaluacionRiesgoControl?: number;
    nivelRiesgoControl?: string;
    detallesRiesgo?: DetalleRiesgoDto[];
}
