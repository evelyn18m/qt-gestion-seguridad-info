<script lang="ts" setup>
const { primerInicio, setPassword } = useAuth()
const password = ref('')
const confirmPassword = ref('')
const errorMsg = ref('')
const loading = ref(false)

const emit = defineEmits<{
  close: []
}>()

async function handleSubmit() {
  errorMsg.value = ''

  if (password.value.length < 8) {
    errorMsg.value = 'La contraseña debe tener al menos 8 caracteres'
    return
  }

  if (password.value !== confirmPassword.value) {
    errorMsg.value = 'Las contraseñas no coinciden'
    return
  }

  loading.value = true
  try {
    await setPassword(password.value)
    emit('close')
  } catch (err: any) {
    errorMsg.value =
      err?.data?.message || 'Error al configurar la contraseña'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <div v-if="primerInicio.value" class="modal-overlay">
      <div class="modal-card">
        <div class="modal-header">
          <h2>Configurar Contraseña</h2>
          <p>Por ser su primer inicio de sesión, debe establecer una contraseña para acceder al sistema.</p>
        </div>

        <form class="modal-form" @submit.prevent="handleSubmit">
          <div class="form-group">
            <label for="new-password">Nueva contraseña</label>
            <input
              id="new-password"
              v-model="password"
              autocomplete="new-password"
              class="form-input"
              minlength="8"
              placeholder="Mínimo 8 caracteres"
              required
              type="password"
            />
          </div>
          <div class="form-group">
            <label for="confirm-password">Confirmar contraseña</label>
            <input
              id="confirm-password"
              v-model="confirmPassword"
              autocomplete="new-password"
              class="form-input"
              minlength="8"
              placeholder="Repita la contraseña"
              required
              type="password"
            />
          </div>

          <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>

          <button :disabled="loading" class="btn-primary" type="submit">
            <span v-if="!loading">Guardar Contraseña</span>
            <span v-else>Guardando...</span>
          </button>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-card {
  background: var(--card-bg, rgba(30, 41, 59, 0.9));
  backdrop-filter: blur(12px);
  border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
  padding: 2.5rem;
  border-radius: 20px;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  animation: fadeIn 0.3s ease-out;
}

.modal-header {
  text-align: center;
  margin-bottom: 2rem;
}

.modal-header h2 {
  font-size: 1.5rem;
  font-weight: 700;
  color: white;
  margin: 0 0 0.5rem;
}

.modal-header p {
  color: var(--text-muted, #94a3b8);
  font-size: 0.9rem;
  margin: 0;
}

.modal-form {
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

.btn-primary {
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
}

.btn-primary:hover:not(:disabled) {
  background: var(--primary-hover, #4f46e5);
  transform: translateY(-2px);
  box-shadow: 0 10px 15px -3px rgba(99, 102, 241, 0.4);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
