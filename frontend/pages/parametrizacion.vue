<script lang="ts" setup>
// ─── Reglas de parametrización de riesgos (ISO 27005) ───

interface Umbral {
  rango: string
  label: string
  color: string
  bg: string
}

interface Parametrizacion {
  titulo: string
  descripcion: string
  campo: string
  umbrales: Umbral[]
}

const parametrizaciones: Parametrizacion[] = [
  {
    titulo: 'Nivel de Riesgo',
    descripcion: 'Riesgo inherente calculado como VA × Amenaza × Vulnerabilidad.',
    campo: 'evaluacionRiesgo',
    umbrales: [
      { rango: '1 – 3', label: 'Bajo', color: '#16a34a', bg: 'rgba(22,163,74,0.15)' },
      { rango: '4 – 9', label: 'Medio', color: '#ca8a04', bg: 'rgba(202,138,4,0.15)' },
      { rango: '10 – 27', label: 'Alto', color: '#dc2626', bg: 'rgba(220,38,38,0.15)' },
    ],
  },
  {
    titulo: 'Riesgo con Control',
    descripcion: 'Riesgo residual tras aplicar controles. Misma escala que el riesgo inherente.',
    campo: 'evaluacionRiesgoControl',
    umbrales: [
      { rango: '1 – 3', label: 'Bajo', color: '#16a34a', bg: 'rgba(22,163,74,0.15)' },
      { rango: '4 – 9', label: 'Medio', color: '#ca8a04', bg: 'rgba(202,138,4,0.15)' },
      { rango: '10 – 27', label: 'Alto', color: '#dc2626', bg: 'rgba(220,38,38,0.15)' },
    ],
  },
  {
    titulo: 'Riesgo Residual',
    descripcion: 'Clasificación final del riesgo después del tratamiento.',
    campo: 'evaluacionRiesgoControl',
    umbrales: [
      { rango: '1 – 3', label: 'Aceptable', color: '#16a34a', bg: 'rgba(22,163,74,0.15)' },
      { rango: '4 – 27', label: 'Inaceptable', color: '#dc2626', bg: 'rgba(220,38,38,0.15)' },
    ],
  },
]
</script>

<template>
  <div class="parametrizacion-section">
    <div class="welcome-banner">
      <h2>Parametrización</h2>
      <p>Umbrales de clasificación de riesgos según ISO 27005.</p>
    </div>

    <div class="cards-grid">
      <div v-for="param in parametrizaciones" :key="param.titulo" class="param-card">
        <h3 class="card-title">{{ param.titulo }}</h3>
        <p class="card-desc">{{ param.descripcion }}</p>
        <p class="card-field">
          Campo: <code>{{ param.campo }}</code>
        </p>

        <table class="umbral-table">
          <thead>
            <tr>
              <th>Rango</th>
              <th>Clasificación</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in param.umbrales" :key="u.rango">
              <td class="rango-cell">{{ u.rango }}</td>
              <td>
                <span
                  class="umbral-badge"
                  :style="{ background: u.bg, color: u.color }"
                >
                  {{ u.label }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.parametrizacion-section {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.welcome-banner {
  margin-bottom: 2rem;
}

.welcome-banner h2 {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.welcome-banner p {
  color: var(--text-muted);
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 1.5rem;
}

.param-card {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 1.5rem;
}

.card-title {
  font-size: 1.15rem;
  margin: 0 0 0.5rem;
  color: var(--text);
}

.card-desc {
  font-size: 0.9rem;
  color: var(--text-muted);
  margin: 0 0 0.5rem;
  line-height: 1.5;
}

.card-field {
  font-size: 0.85rem;
  color: var(--text-muted);
  margin: 0 0 1rem;
}

.card-field code {
  background: rgba(99, 102, 241, 0.1);
  padding: 0.15rem 0.5rem;
  border-radius: 6px;
  font-size: 0.85rem;
  color: #818cf8;
}

.umbral-table {
  width: 100%;
  border-collapse: collapse;
}

.umbral-table th,
.umbral-table td {
  padding: 0.6rem 0.75rem;
  text-align: left;
  border-bottom: 1px solid var(--border);
}

.umbral-table th {
  color: var(--text-muted);
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.umbral-table td {
  color: var(--text);
  font-size: 0.9rem;
}

.rango-cell {
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 0.9rem;
}

.umbral-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.8rem;
  font-weight: 600;
}

@media (max-width: 768px) {
  .cards-grid {
    grid-template-columns: 1fr;
  }
}
</style>
