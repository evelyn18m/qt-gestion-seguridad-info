<script setup lang="ts">
import type { CatalogoItem } from '~/types/api'
import { calcularEvaluacionRiesgo, calcularNivelRiesgo, getNivelStyle, getCatalogoLabel } from '~/utils/riskCalculations'

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

const props = defineProps<{
  detallesRiesgo: DetalleRiesgo[]
  valRiesgos: CatalogoItem[]
  valTiposControl: CatalogoItem[]
  valAmenazas: CatalogoItem[]
  valVulnerabilidades: CatalogoItem[]
  evaluacionVulnerabilidadRiesgoId?: string | number
  ciaAverage: number
}>()

const detallesAmenazas = computed(() => props.detallesRiesgo.filter(d => d.tipo === 'amenaza'))
const detallesVulnerabilidades = computed(() => props.detallesRiesgo.filter(d => d.tipo === 'vulnerabilidad'))

function updateControlDetalle(d: DetalleRiesgo) {
  const vulnRiesgoId = props.evaluacionVulnerabilidadRiesgoId ?? 0
  d.evaluacionRiesgoControl = calcularEvaluacionRiesgo(d.riesgoControlId, vulnRiesgoId, props.ciaAverage, props.valRiesgos)
  d.nivelRiesgoControl = calcularNivelRiesgo(d.evaluacionRiesgoControl)
}
</script>

<template>
  <div class="val-tab-panel">
    <div class="val-card" style="border:none; padding:0; background:transparent;">
      <h3 class="val-card-title">Tratamiento de Riesgo por Item</h3>
      <div v-if="detallesRiesgo.length === 0" class="chip-empty">No hay items para tratar. Complete la Pestana 2 y evalue en la Pestana 3.</div>
      <div v-else class="val-grid" style="grid-template-columns: 1fr 1fr; gap:1.5rem; margin-top:1rem;">
        <!-- COLUMNA: Amenazas -->
        <div>
          <h4 style="margin:0 0 0.75rem 0; font-size:0.95rem; color:var(--text-muted);">Amenazas</h4>
          <table class="val-table" v-if="detallesAmenazas.length > 0">
            <thead>
              <tr>
                <th>Item</th>
                <th>Metodo</th>
                <th>Tipo Control</th>
                <th>Riesgo (Ctrl)</th>
                <th>Eval. (Ctrl)</th>
                <th>Nivel (Ctrl)</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="d in detallesAmenazas" :key="d.catalogoId">
                <td>{{ getCatalogoLabel(d.tipo, d.catalogoId, valAmenazas, valVulnerabilidades) }}</td>
                <td><input v-model="d.metodoTratamiento" type="text" placeholder="Metodo" style="min-width:100px;" /></td>
                <td>
                  <select v-model="d.tipoControlId" style="min-width:110px;">
                    <option value="">Seleccionar...</option>
                    <option v-for="tc in valTiposControl" :key="tc.id" :value="tc.id">{{ tc.nombre }}</option>
                  </select>
                </td>
                <td>
                  <select v-model="d.riesgoControlId" @change="updateControlDetalle(d)" style="min-width:110px;">
                    <option value="">Seleccionar...</option>
                    <option v-for="r in valRiesgos" :key="r.id" :value="r.id">{{ r.evaluacion }}</option>
                  </select>
                </td>
                <td>
                  <span v-if="d.evaluacionRiesgoControl > 0">{{ d.evaluacionRiesgoControl.toFixed(2) }}</span>
                  <span v-else style="color:var(--text-muted); font-size:0.85rem;">-</span>
                </td>
                <td>
                  <span v-if="d.nivelRiesgoControl" class="nivel-badge" :style="{ color: getNivelStyle(d.nivelRiesgoControl).color, background: getNivelStyle(d.nivelRiesgoControl).bg }">
                    {{ getNivelStyle(d.nivelRiesgoControl).label }}
                  </span>
                  <span v-else style="color:var(--text-muted); font-size:0.85rem;">-</span>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-else class="chip-empty" style="margin-top:0.5rem;">Sin amenazas</div>
        </div>

        <!-- COLUMNA: Vulnerabilidades -->
        <div>
          <h4 style="margin:0 0 0.75rem 0; font-size:0.95rem; color:var(--text-muted);">Vulnerabilidades</h4>
          <table class="val-table" v-if="detallesVulnerabilidades.length > 0">
            <thead>
              <tr>
                <th>Item</th>
                <th>Metodo</th>
                <th>Tipo Control</th>
                <th>Riesgo (Ctrl)</th>
                <th>Eval. (Ctrl)</th>
                <th>Nivel (Ctrl)</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="d in detallesVulnerabilidades" :key="d.catalogoId">
                <td>{{ getCatalogoLabel(d.tipo, d.catalogoId, valAmenazas, valVulnerabilidades) }}</td>
                <td><input v-model="d.metodoTratamiento" type="text" placeholder="Metodo" style="min-width:100px;" /></td>
                <td>
                  <select v-model="d.tipoControlId" style="min-width:110px;">
                    <option value="">Seleccionar...</option>
                    <option v-for="tc in valTiposControl" :key="tc.id" :value="tc.id">{{ tc.nombre }}</option>
                  </select>
                </td>
                <td>
                  <select v-model="d.riesgoControlId" @change="updateControlDetalle(d)" style="min-width:110px;">
                    <option value="">Seleccionar...</option>
                    <option v-for="r in valRiesgos" :key="r.id" :value="r.id">{{ r.evaluacion }}</option>
                  </select>
                </td>
                <td>
                  <span v-if="d.evaluacionRiesgoControl > 0">{{ d.evaluacionRiesgoControl.toFixed(2) }}</span>
                  <span v-else style="color:var(--text-muted); font-size:0.85rem;">-</span>
                </td>
                <td>
                  <span v-if="d.nivelRiesgoControl" class="nivel-badge" :style="{ color: getNivelStyle(d.nivelRiesgoControl).color, background: getNivelStyle(d.nivelRiesgoControl).bg }">
                    {{ getNivelStyle(d.nivelRiesgoControl).label }}
                  </span>
                  <span v-else style="color:var(--text-muted); font-size:0.85rem;">-</span>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-else class="chip-empty" style="margin-top:0.5rem;">Sin vulnerabilidades</div>
        </div>
      </div>
    </div>
  </div>
</template>
