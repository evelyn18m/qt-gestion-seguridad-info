<script lang="ts" setup>
definePageMeta({ layout: false })

const { loggedIn, login, loginLocal } = useAuth()
const username = ref('')
const password = ref('')
const errorMsg = ref('')
const loading = ref(false)

// Redirect if already authenticated
if (loggedIn.value) {
  await navigateTo('/')
}

async function handleLocalLogin() {
  errorMsg.value = ''
  loading.value = true
  try {
    await loginLocal({
      username: username.value,
      password: password.value,
    })
    await navigateTo('/')
  } catch (err: any) {
    if (err?.statusCode === 403 || err?.data?.message) {
      errorMsg.value = err.data?.message || 'Debe configurar su contraseña primero'
    } else if (err?.statusCode === 401) {
      errorMsg.value = 'Credenciales inválidas'
    } else {
      errorMsg.value = 'Error de conexión. Intente nuevamente.'
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="premium-container">
    <div class="login-card">
      <div class="logo-section">
        <img
          alt="Quito Turismo"
          class="logo-img"
          src="https://turismo.quito.gob.ec/wp-content/uploads/2024/06/logoQT-1024x166.png"
        />
        <h1>Gestión de Seguridad</h1>
        <p>Sistema de Seguridad de la Información (SGSI)</p>
      </div>

      <!-- Local login form -->
      <form class="login-form" @submit.prevent="handleLocalLogin">
        <div class="form-group">
          <label for="username">Usuario</label>
          <input
            id="username"
            v-model="username"
            autocomplete="username"
            class="form-input"
            placeholder="Nombre de usuario"
            required
            type="text"
          />
        </div>
        <div class="form-group">
          <label for="password">Contraseña</label>
          <input
            id="password"
            v-model="password"
            autocomplete="current-password"
            class="form-input"
            placeholder="Contraseña"
            required
            type="password"
          />
        </div>

        <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>

        <button :disabled="loading" class="login-btn" type="submit">
          <span v-if="!loading">Iniciar Sesión</span>
          <span v-else>Cargando...</span>
        </button>
      </form>

      <div class="divider">
        <span>o</span>
      </div>

      <!-- Keycloak login -->
      <button class="keycloak-btn" @click="login">
        <svg
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          style="width: 20px; height: 20px"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <span>Ingresar con Keycloak</span>
      </button>

      <div class="footer-text">
        © 2026 Quito Turismo. Todos los derechos reservados.
      </div>
    </div>
  </div>
</template>

<style scoped>
.premium-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(
      circle at top right,
      rgba(99, 102, 241, 0.15),
      transparent
    ),
    radial-gradient(
      circle at bottom left,
      rgba(79, 70, 229, 0.1),
      transparent
    );
}

.login-card {
  background: var(--card-bg, rgba(30, 41, 59, 0.7));
  backdrop-filter: blur(12px);
  border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
  padding: 3rem;
  border-radius: 24px;
  width: 100%;
  max-width: 450px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}

.logo-section {
  text-align: center;
  margin-bottom: 2rem;
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
  color: var(--text-muted, #94a3b8);
  margin-top: 0.5rem;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-muted, #94a3b8);
}

.form-input {
  padding: 0.75rem 1rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
  border-radius: 10px;
  color: white;
  font-size: 0.95rem;
  font-family: inherit;
  transition: border-color 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: var(--primary, #6366f1);
}

.form-input::placeholder {
  color: rgba(255, 255, 255, 0.3);
}

.error-msg {
  color: #ef4444;
  font-size: 0.85rem;
  margin: 0;
  text-align: center;
}

.login-btn {
  width: 100%;
  padding: 0.85rem;
  background: var(--primary, #6366f1);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: inherit;
  margin-top: 0.5rem;
}

.login-btn:hover:not(:disabled) {
  background: var(--primary-hover, #4f46e5);
  transform: translateY(-2px);
  box-shadow: 0 10px 15px -3px rgba(99, 102, 241, 0.4);
}

.login-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.divider {
  display: flex;
  align-items: center;
  margin: 1.5rem 0;
  color: var(--text-muted, #94a3b8);
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.1));
}

.divider span {
  padding: 0 1rem;
  font-size: 0.85rem;
}

.keycloak-btn {
  width: 100%;
  padding: 0.85rem;
  background: transparent;
  color: white;
  border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
  border-radius: 12px;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: inherit;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.keycloak-btn:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: var(--primary, #6366f1);
}

.footer-text {
  text-align: center;
  color: var(--text-muted, #94a3b8);
  font-size: 0.8rem;
  margin-top: 2rem;
}
</style>
