/**
 * Pure risk calculation utilities — no Vue reactivity, no side effects.
 * Can be imported directly from .ts files without composable context.
 */
import type { CatalogoItem } from '~/types/api'

export function calcularEvaluacionRiesgo(
  amenazaRiesgoId: string | number,
  vulnerabilidadRiesgoId: string | number,
  ciaAverage: number,
  valRiesgos: CatalogoItem[],
) {
  if (ciaAverage === 0 || !amenazaRiesgoId || !vulnerabilidadRiesgoId) return 0
  const amenaza = getValorRiesgoStatic(amenazaRiesgoId, valRiesgos)
  const vulnerabilidad = getValorRiesgoStatic(vulnerabilidadRiesgoId, valRiesgos)
  if (!amenaza || !vulnerabilidad) return 0
  return Math.round(ciaAverage * amenaza * vulnerabilidad * 100) / 100
}

export function calcularNivelRiesgo(evaluacion: number) {
  if (evaluacion >= 18) return 'Critico'
  if (evaluacion >= 9) return 'Alto'
  if (evaluacion >= 3) return 'Medio'
  return 'Bajo'
}

export function getNivelStyle(nivel: string) {
  const n = (nivel || '').toLowerCase()
  if (n.includes('critico')) return { label: 'Critico', color: '#dc2626', bg: 'rgba(220,38,38,0.15)' }
  if (n.includes('alto')) return { label: 'Alto', color: '#ea580c', bg: 'rgba(234,88,12,0.15)' }
  if (n.includes('medio')) return { label: 'Medio', color: '#ca8a04', bg: 'rgba(202,138,4,0.15)' }
  return { label: 'Bajo', color: '#16a34a', bg: 'rgba(22,163,74,0.15)' }
}

export function getMaxNivelIndex(nivel: string) {
  const n = (nivel || '').toLowerCase()
  if (n.includes('critico')) return 4
  if (n.includes('alto')) return 3
  if (n.includes('medio')) return 2
  return 1
}

export function getNivelFromIndex(idx: number) {
  if (idx >= 4) return 'Critico'
  if (idx >= 3) return 'Alto'
  if (idx >= 2) return 'Medio'
  return 'Bajo'
}

export function getCatalogoLabel(
  tipo: string,
  catalogoId: number,
  valAmenazas: CatalogoItem[],
  valVulnerabilidades: CatalogoItem[],
) {
  if (tipo === 'amenaza') {
    const a = valAmenazas.find((x: any) => x.id === catalogoId)
    return a ? a.categoria + ' - ' + a.nombre : 'A#' + catalogoId
  }
  const v = valVulnerabilidades.find((x: any) => x.id === catalogoId)
  return v ? v.categoria + ' - ' + v.descripcion : 'V#' + catalogoId
}

export function getTipoControlName(id: number | string, valTiposControl: CatalogoItem[]) {
  if (!id) return '-'
  const found = valTiposControl.find((tc: any) => tc.id === Number(id))
  return found ? found.nombre : 'TC#' + id
}

// --- Private helpers ---

function getValorRiesgoStatic(id: string | number, valRiesgos: CatalogoItem[]) {
  if (!id) return 0
  const found = valRiesgos.find((r: any) => r.id === Number(id))
  return found ? (found.valor || 0) : 0
}
