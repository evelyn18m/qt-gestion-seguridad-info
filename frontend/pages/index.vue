<script setup lang="ts">
</script>

<template>
  <div>
    <div class="welcome-banner">
      <h2>Bienvenido al Sistema de Gestión de Seguridad de la Información</h2>
      <p>Selecciona una opción del menú para comenzar.</p>
    </div>
    <div class="dashboard-grid">
      
    </div>
  </div>
</template>

<style scoped>
.welcome-banner {
  margin-bottom: 3rem;
}

.welcome-banner h2 {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.welcome-banner p {
  color: var(--text-muted);
}

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 2rem;
}

.stat-card {
  background: var(--card-bg);
  border: 1px solid var(--border);
  padding: 2rem;
  border-radius: 20px;
  transition: transform 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-5px);
}

.stat-card h3 {
  font-size: 0.9rem;
  color: var(--text-muted);
  margin: 0 0 1rem 0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.stat-value {
  font-size: 2.5rem;
  font-weight: 700;
}
</style>
