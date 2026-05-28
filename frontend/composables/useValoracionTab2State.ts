/**
 * useValoracionTab2State — Tab 2 (Análisis de Riesgos) composable skeleton.
 * Full implementation deferred per proposal scope.
 */
import type { Ref } from 'vue'
import type { CatalogoItem } from '~/types/api'

interface DetalleRiesgo {
  id?: number
  tipo: string
  catalogoId: number
  riesgoId: string | number
  evaluacionRiesgo: number
  nivelRiesgo: string
  metodoTratamiento: string
  tipoControlId: string | number
  riesgoControlId: string | number
  evaluacionRiesgoControl: number
  nivelRiesgoControl: string
}

export function useValoracionTab2State(
  _detallesRiesgo: Ref<DetalleRiesgo[]>,
  _valAmenazas: Ref<CatalogoItem[]>,
  _valVulnerabilidades: Ref<CatalogoItem[]>,
) {
  function agregarAmenaza(_catalogoId: number): void {
    throw 'not implemented'
  }

  function quitarAmenaza(_catalogoId: number): void {
    throw 'not implemented'
  }

  function agregarVulnerabilidad(_catalogoId: number): void {
    throw 'not implemented'
  }

  function quitarVulnerabilidad(_catalogoId: number): void {
    throw 'not implemented'
  }

  function rebuildDetalles(): void {
    throw 'not implemented'
  }

  return {
    agregarAmenaza,
    quitarAmenaza,
    agregarVulnerabilidad,
    quitarVulnerabilidad,
    rebuildDetalles,
  }
}
