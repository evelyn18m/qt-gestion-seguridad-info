<script lang="ts" setup>
</script>

<template>
  <div class="tabs-horizontal">
    <NuxtLink to="/reportes/valoracion-activos" class="tab-btn" active-class="active">
      Valoración de Activos
    </NuxtLink>
    <NuxtLink to="/reportes/analisis-riesgo" class="tab-btn" active-class="active">
      Análisis de Riesgo
    </NuxtLink>
    <NuxtLink to="/reportes/evaluacion-riesgo" class="tab-btn" active-class="active">
      Evaluación de Riesgo
    </NuxtLink>
    <NuxtLink to="/reportes/tratamiento-riesgo" class="tab-btn" active-class="active">
      Tratamiento de Riesgo
    </NuxtLink>
    <NuxtLink to="/reportes/plan-tratamiento" class="tab-btn" active-class="active">
      Plan de Tratamiento
    </NuxtLink>
    <NuxtLink to="/reportes/mapa-calor" class="tab-btn" active-class="active">
      Mapa de Calor
    </NuxtLink>
  </div>
</template>

<style scoped>
/* ── Tabs Horizontal ─────────────────────────────────────────────────────────── */
.tabs-horizontal {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid var(--border);
  padding-bottom: 0;
  flex-shrink: 0;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--text-muted);
  font-family: inherit;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-bottom: -1px;
  text-decoration: none;
}

.tab-btn:hover {
  color: var(--text);
  background: rgba(255, 255, 255, 0.03);
}

.tab-btn.active {
  color: var(--primary);
  border-bottom-color: var(--primary);
  font-weight: 600;
}
</style>
