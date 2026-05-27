<script setup lang="ts">
const { username, password, loading, error, isLoggedIn, login, logout } = useAuth()
</script>

<template>
  <div>
    <div v-if="!isLoggedIn" class="premium-container">
      <div class="login-card">
        <div class="logo-section">
          <img src="https://turismo.quito.gob.ec/wp-content/uploads/2024/06/logoQT-1024x166.png" alt="Quito Turismo" class="logo-img">
          <h1>Gestión de Seguridad</h1>
          <p>Sistema de Seguridad de la Información (SGSI)</p>
        </div>

        <div class="form-group">
          <label for="username">Usuario</label>
          <input id="username" v-model="username" type="text" placeholder="Ingresa tu usuario" @keyup.enter="login">
        </div>

        <div class="form-group">
          <label for="password">Contraseña</label>
          <input id="password" v-model="password" type="password" placeholder="••••••••" @keyup.enter="login">
        </div>

        <button class="login-btn" :disabled="loading" @click="login">
          <span v-if="loading">Cargando...</span>
          <span v-else>Iniciar Sesión</span>
          <svg v-if="!loading" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 18px; height: 18px;">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </button>

        <div v-if="error" class="error-msg">
          {{ error }}
        </div>

        <div class="footer-text">
          &copy; 2026 Quito Turismo. Todos los derechos reservados.
        </div>
      </div>
    </div>

    <NuxtLayout v-else>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap');

:root {
  --primary: #6366f1;
  --primary-hover: #4f46e5;
  --bg: #0f172a;
  --card-bg: rgba(30, 41, 59, 0.7);
  --header-bg: rgba(15, 23, 42, 0.8);
  --text: #f8fafc;
  --text-muted: #94a3b8;
  --border: rgba(255, 255, 255, 0.1);
  --sidebar-width: 260px;
}

body {
  margin: 0;
  font-family: 'Outfit', sans-serif;
  background-color: var(--bg);
  color: var(--text);
  overflow-x: hidden;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Auth Styles */
.premium-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at top right, rgba(99, 102, 241, 0.15), transparent),
              radial-gradient(circle at bottom left, rgba(79, 70, 229, 0.1), transparent);
}

.login-card {
  background: var(--card-bg);
  backdrop-filter: blur(12px);
  border: 1px solid var(--border);
  padding: 3rem;
  border-radius: 24px;
  width: 100%;
  max-width: 450px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  animation: fadeIn 0.8s ease-out;
}

.logo-section {
  text-align: center;
  margin-bottom: 2.5rem;
}

.logo-img {
  max-width: 280px;
  height: auto;
  margin-bottom: 1.5rem;
  filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.2));
}

.login-card h1 {
  font-size: 1.75rem;
  font-weight: 700;
  margin: 0;
  color: white;
}

.login-card p {
  color: var(--text-muted);
  margin-top: 0.5rem;
}

.form-group {
  margin-bottom: 1.5rem;
  text-align: left;
}

.form-group label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-muted);
  margin-bottom: 0.5rem;
}

.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 0.875rem;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid var(--border);
  border-radius: 12px;
  color: white;
  font-family: inherit;
  font-size: 1rem;
  transition: all 0.3s ease;
  box-sizing: border-box;
}

.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
}

.login-btn {
  width: 100%;
  padding: 1rem;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 2rem;
}

.login-btn:hover:not(:disabled) {
  background: var(--primary-hover);
  transform: translateY(-2px);
  box-shadow: 0 10px 15px -3px rgba(99, 102, 241, 0.4);
}

.error-msg {
  color: #ef4444;
  font-size: 0.875rem;
  margin-top: 1rem;
  text-align: center;
}

.footer-text {
  text-align: center;
  color: var(--text-muted);
  font-size: 0.8rem;
  margin-top: 2rem;
}

/* Shared Button Styles */
.btn-primary {
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: inherit;
}

.btn-primary:hover:not(:disabled) {
  background: var(--primary-hover);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-cancel {
  background: transparent;
  color: var(--text-muted);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 0.5rem 1.25rem;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.2s ease;
}

.btn-cancel:hover {
  background: rgba(255,255,255,0.05);
  color: var(--text);
}

.btn-danger {
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 10px;
  padding: 0.5rem 1.25rem;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.2s ease;
}

.btn-danger:hover {
  background: #dc2626;
}

.btn-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.btn-icon svg {
  width: 16px;
  height: 16px;
}

.btn-edit:hover {
  background: rgba(99, 102, 241, 0.1);
  color: var(--primary);
  border-color: var(--primary);
}

.btn-delete:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  border-color: #ef4444;
}

.btn-sm {
  padding: 0.5rem 1rem;
  font-size: 0.85rem;
}
</style>
