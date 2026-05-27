<script setup lang="ts">
const isSidebarOpen = ref(false)
const catalogosOpen = ref(false)
const { userData, logout } = useAuth()

function closeSidebar() {
  isSidebarOpen.value = false
}

const catalogos = [
  { path: '/catalogos/amenazas', label: 'Amenazas' },
  { path: '/catalogos/vulnerabilidades', label: 'Vulnerabilidades' },
  { path: '/catalogos/impactos', label: 'Impactos' },
  { path: '/catalogos/formatos', label: 'Formatos' },
  { path: '/catalogos/subprocesos', label: 'Subprocesos' },
  { path: '/catalogos/macroprocesos', label: 'Macroprocesos' },
  { path: '/catalogos/tipos-activo', label: 'Tipos de Activo' },
  { path: '/catalogos/valoraciones', label: 'Valoraciones' },
  { path: '/catalogos/funcionarios', label: 'Funcionarios' },
  { path: '/catalogos/areas', label: '&Aacute;reas' },
  { path: '/catalogos/tipos-control', label: 'Tipos de Control' },
  { path: '/catalogos/riesgos', label: 'Riesgos' },
  { path: '/catalogos/probabilidades', label: 'Probabilidad' },
]
</script>

<template>
  <div class="app-layout">
    <!-- Top Banner -->
    <header class="top-banner">
      <div class="header-left">
        <img src="https://turismo.quito.gob.ec/wp-content/uploads/2024/06/logoQT-1024x166.png" alt="Quito Turismo" class="header-logo">
        <span class="app-title">SGSI Platform</span>
      </div>

      <div class="header-right">
        <div class="user-info">
          <div class="user-details">
            <span class="user-name">{{ userData?.name || userData?.preferred_username }}</span>
            <span class="user-role">{{ userData?.resource_access?.['sgsi-app']?.roles?.[0] || 'Usuario' }}</span>
          </div>
          <div class="user-avatar">
            {{ (userData?.name || userData?.preferred_username || 'U').charAt(0).toUpperCase() }}
          </div>
        </div>
        <button class="logout-mini-btn" title="Cerrar Sesión" @click="logout">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
          </svg>
        </button>
      </div>
    </header>

    <div class="main-container">
      <!-- Sidebar -->
      <aside class="sidebar" :class="{ 'sidebar-open': isSidebarOpen }">
        <nav class="sidebar-nav">
          <NuxtLink to="/" class="nav-item" active-class="active" exact-active-class="active" @click="closeSidebar">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
            <span>Inicio</span>
          </NuxtLink>
          <div class="nav-group">
            <div class="nav-item" :class="{ active: catalogosOpen }" @click="catalogosOpen = !catalogosOpen">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
              </svg>
              <span>Catálogos</span>
              <svg class="chevron" :class="{ open: catalogosOpen }" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </div>
            <div v-show="catalogosOpen" class="nav-submenu">
              <NuxtLink v-for="c in catalogos" :key="c.path" :to="c.path" class="nav-subitem" active-class="active" @click="closeSidebar">
                {{ c.label }}
              </NuxtLink>
            </div>
          </div>
          <NuxtLink to="/valoracion" class="nav-item" active-class="active" @click="closeSidebar">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605" />
            </svg>
            <span>Valoración de Activos</span>
          </NuxtLink>
        </nav>

        <div class="sidebar-footer">
          <button class="logout-sidebar-btn" @click="logout">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
            </svg>
            <span>Salir</span>
          </button>
        </div>
      </aside>

      <!-- Content Area -->
      <main class="content-area">
        <slot />
      </main>

      <!-- Mobile Menu Toggle -->
      <button class="mobile-toggle" @click="isSidebarOpen = !isSidebarOpen">
        <svg v-if="!isSidebarOpen" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.app-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  background: var(--bg);
}

.top-banner {
  height: 70px;
  background: var(--header-bg);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 2rem;
  z-index: 100;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.header-logo {
  height: 35px;
}

.app-title {
  font-weight: 700;
  font-size: 1.25rem;
  background: linear-gradient(to right, #fff, #94a3b8);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.5rem 1rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 50px;
  border: 1px solid var(--border);
}

.user-details {
  display: flex;
  flex-direction: column;
  text-align: right;
}

.user-name {
  font-weight: 600;
  font-size: 0.9rem;
}

.user-role {
  font-size: 0.75rem;
  color: #a855f7;
  font-weight: 600;
  text-transform: uppercase;
}

.user-avatar {
  width: 35px;
  height: 35px;
  background: var(--primary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  color: white;
}

.logout-mini-btn {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  color: #ef4444;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.logout-mini-btn svg {
  width: 20px;
  height: 20px;
}

.logout-mini-btn:hover {
  background: #ef4444;
  color: white;
}

.main-container {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.sidebar {
  width: var(--sidebar-width);
  background: rgba(15, 23, 42, 0.5);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease;
}

.sidebar-nav {
  flex: 1;
  padding: 1.5rem 1rem;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border-radius: 12px;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.3s ease;
  text-decoration: none;
}

.nav-item.active {
  background: rgba(99, 102, 241, 0.1);
  color: white;
  border: 1px solid rgba(99, 102, 241, 0.2);
}

.nav-item:hover:not(.active) {
  background: rgba(255, 255, 255, 0.05);
  color: white;
}

.nav-item svg {
  width: 24px;
  height: 24px;
}

.nav-item .chevron {
  width: 16px;
  height: 16px;
  margin-left: auto;
  transition: transform 0.2s;
}

.nav-item .chevron.open {
  transform: rotate(180deg);
}

.nav-group {
  display: flex;
  flex-direction: column;
}

.nav-submenu {
  display: flex;
  flex-direction: column;
  padding-left: 1rem;
  margin-left: 0.5rem;
  border-left: 1px solid var(--border);
}

.nav-subitem {
  padding: 0.6rem 1rem;
  border-radius: 8px;
  color: var(--text-muted);
  font-size: 0.85rem;
  text-decoration: none;
  transition: all 0.2s;
}

.nav-subitem.active {
  background: rgba(99, 102, 241, 0.1);
  color: white;
}

.nav-subitem:hover:not(.active) {
  background: rgba(255, 255, 255, 0.05);
  color: white;
}

.sidebar-footer {
  padding: 1.5rem 1rem;
  border-top: 1px solid var(--border);
}

.logout-sidebar-btn {
  width: 40px !important;
  height: 40px !important;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 10px;
  color: #ef4444;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  margin: 0 auto;
  flex-shrink: 0;
}

.logout-sidebar-btn svg {
  width: 20px !important;
  height: 20px !important;
}

.logout-sidebar-btn span {
  display: none !important;
}

.logout-sidebar-btn:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  border-color: rgba(239, 68, 68, 0.2);
}

.content-area {
  flex: 1;
  padding: 2.5rem;
  overflow-y: auto;
  background: radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.05), transparent);
}

.mobile-toggle {
  display: none;
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: var(--primary);
  color: white;
  border: none;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
  z-index: 200;
  align-items: center;
  justify-content: center;
}

@media (max-width: 1024px) {
  .sidebar {
    position: fixed;
    left: -100%;
    top: 0;
    height: 100vh;
    z-index: 150;
    background: var(--bg);
    width: 280px;
  }

  .sidebar-open {
    left: 0;
  }

  .mobile-toggle {
    display: flex;
  }

  .content-area {
    padding: 1.5rem;
  }
}

@media (max-width: 768px) {
  .top-banner {
    padding: 0 1rem;
  }

  .header-logo {
    height: 25px;
  }

  .app-title {
    display: none;
  }

  .user-details {
    display: none;
  }
}
</style>
