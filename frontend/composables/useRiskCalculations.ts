/**
 * Risk calculations composable — extracted from valoracion.vue
 * Pure calculation logic with Vue reactivity: CIA averages, risk evaluation, nivel thresholds.
 */
import type { Ref } from 'vue'
import type { CatalogoItem } from '~/types/api'

export function useRiskCalculations(
  valImpactos: Ref<CatalogoItem[]>,
  valRiesgos: Ref<CatalogoItem[]>,
  valForm: Ref<{ confidencialidad: string; integridad: string; disponibilidad: string }>,
  evaluacionForm: Ref<{ amenazaRiesgoId: string; vulnerabilidadRiesgoId: string }>,
  tratamientoForm: Ref<{ nivelAmenazaControl: string; nivelVulnerabilidadControl: string }>,
) {
  // --- Lookup helpers ---

  function getNivelesImpacto(tipo: string) {
    return valImpactos.value.filter((i: any) => i.tipo === tipo)
  }

  function getValorImpacto(id: string | number) {
    if (!id) return 0
    const found = valImpactos.value.find((i: any) => i.id === Number(id))
    return found ? found.valor : 0
  }

  function getValorRiesgo(id: string | number) {
    if (!id) return 0
    const found = valRiesgos.value.find((r: any) => r.id === Number(id))
    return found ? (found.valor || 0) : 0
  }

  // --- CIA row helpers ---

  function calculateRowCiaAverage(v: any) {
    const c = getValorImpacto(v.confidencialidadId)
    const i = getValorImpacto(v.integridadId)
    const d = getValorImpacto(v.disponibilidadId)
    const selected = [c, i, d].filter(val => val > 0)
    if (selected.length === 0) return 0
    return Math.round((selected.reduce((a, b) => a + b, 0) / selected.length) * 100) / 100
  }

  function getCiaLevel(avg: number) {
    if (avg >= 2.5) return 'Alto'
    if (avg >= 1.5) return 'Medio'
    return 'Bajo'
  }

  // --- CIA average (Tab 1) ---

  const ciaAverage = computed(() => {
    const c = getValorImpacto(valForm.value.confidencialidad)
    const i = getValorImpacto(valForm.value.integridad)
    const d = getValorImpacto(valForm.value.disponibilidad)
    const selected = [c, i, d].filter(v => v > 0)
    if (selected.length === 0) return 0
    return Math.round((selected.reduce((a, b) => a + b, 0) / selected.length) * 100) / 100
  })

  // --- Risk evaluation (Tab 3) ---

  const evaluacionRiesgo = computed(() => {
    const impacto = ciaAverage.value
    const amenaza = getValorRiesgo(evaluacionForm.value.amenazaRiesgoId)
    const vulnerabilidad = getValorRiesgo(evaluacionForm.value.vulnerabilidadRiesgoId)
    if (impacto === 0 || !amenaza || !vulnerabilidad) return 0
    return Math.round(impacto * amenaza * vulnerabilidad * 100) / 100
  })

  const nivelRiesgo = computed(() => {
    const er = evaluacionRiesgo.value
    if (er >= 18) return 'Critico'
    if (er >= 9) return 'Alto'
    if (er >= 3) return 'Medio'
    return 'Bajo'
  })

  // --- Risk evaluation for controls (Tab 4) ---

  const evaluacionRiesgoControl = computed(() => {
    const impacto = ciaAverage.value
    const amenaza = getValorRiesgo(tratamientoForm.value.nivelAmenazaControl)
    const vulnerabilidad = getValorRiesgo(tratamientoForm.value.nivelVulnerabilidadControl)
    if (impacto === 0 || !amenaza || !vulnerabilidad) return 0
    return Math.round(impacto * amenaza * vulnerabilidad * 100) / 100
  })

  const nivelRiesgoControl = computed(() => {
    const er = evaluacionRiesgoControl.value
    if (er >= 18) return 'Critico'
    if (er >= 9) return 'Alto'
    if (er >= 3) return 'Medio'
    return 'Bajo'
  })

  return {
    ciaAverage,
    getNivelesImpacto,
    getValorImpacto,
    getValorRiesgo,
    calculateRowCiaAverage,
    getCiaLevel,
    evaluacionRiesgo,
    nivelRiesgo,
    evaluacionRiesgoControl,
    nivelRiesgoControl,
  }
}
