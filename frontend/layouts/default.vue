<script lang="ts" setup>
const isSidebarOpen = ref(false)
const catalogosOpen = ref(false)
const route = useRoute()
const { usuario, logout, tieneRol } = useAuth()
const { secondsRemaining, isWarning, isExpired, refreshSession } = useSession()

// Parse roles from JSON string for display
const displayName = computed(() => usuario.value?.username || 'Usuario')
const displayRole = computed(() => {
  if (!usuario.value?.roles) return 'Usuario'
  try {
    const roles = JSON.parse(usuario.value.roles)
    return roles[0] || 'Usuario'
  } catch {
    return 'Usuario'
  }
})

function closeSidebar() {
  isSidebarOpen.value = false
}

function isCatalogActive(catalogPath: string): boolean {
  return route.path === '/catalogos' && route.query.tipo === catalogPath.split('?tipo=')[1]
}

const catalogos = [
  {path: '/catalogos?tipo=amenazas', label: 'Amenazas'},
  {path: '/catalogos?tipo=vulnerabilidades', label: 'Vulnerabilidades'},
  {path: '/catalogos?tipo=impactos', label: 'Impactos'},
  {path: '/catalogos?tipo=formatos', label: 'Formatos'},
  {path: '/catalogos?tipo=subprocesos', label: 'Subprocesos'},
  {path: '/catalogos?tipo=macroprocesos', label: 'Macroprocesos'},
  {path: '/catalogos?tipo=tipos-activo', label: 'Tipos de Activo'},
  {path: '/catalogos?tipo=activos', label: 'Activos'},
  {path: '/catalogos?tipo=tipos-datos-personales', label: 'Tipos de Datos Personales'},
  {path: '/catalogos?tipo=valoraciones', label: 'Valoraciones'},
  {path: '/catalogos?tipo=funcionarios', label: 'Funcionarios'},
  {path: '/catalogos?tipo=areas', label: 'Áreas'},
  {path: '/catalogos?tipo=tipos-control', label: 'Tipos de Control'},
  {path: '/catalogos?tipo=riesgos', label: 'Riesgos'},
  {path: '/catalogos?tipo=probabilidades', label: 'Probabilidad'},
  {path: '/catalogos?tipo=categorias-controles-implementar', label: 'Categorías Controles'},
  {path: '/catalogos?tipo=controles-implementar', label: 'Controles a Implementar'},
]
</script>

<template>
  <div class="app-layout">
    <!-- Top Banner -->
    <header class="top-banner">
      <div class="header-left">
        <img alt="Quito Turismo" class="header-logo"
             src="https://turismo.quito.gob.ec/wp-content/uploads/2024/06/logoQT-1024x166.png">
        <span class="app-title">SGSI Platform</span>
      </div>

      <div class="header-right">
        <div class="user-info">
          <div class="user-details">
            <span class="user-name">{{ displayName }}</span>
            <span class="user-role">{{ displayRole }}</span>
          </div>
          <div class="user-avatar">
            {{ (displayName).charAt(0).toUpperCase() }}
          </div>
        </div>
        <button class="logout-mini-btn" title="Cerrar Sesión" @click="logout">
          <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"
               xmlns="http://www.w3.org/2000/svg">
            <path d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" stroke-linecap="round"
                  stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
    </header>

    <SessionWarning
        :is-expired="isExpired"
        :is-warning="isWarning"
        :seconds-remaining="secondsRemaining"
        @refresh="refreshSession"
    />

    <div class="main-container">
      <!-- Sidebar -->
      <aside :class="{ 'sidebar-open': isSidebarOpen }" class="sidebar">
        <nav class="sidebar-nav">
          <NuxtLink active-class="active" class="nav-item" exact-active-class="active" to="/" @click="closeSidebar">
            <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"
                 xmlns="http://www.w3.org/2000/svg">
              <path d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" stroke-linecap="round"
                    stroke-linejoin="round"/>
            </svg>
            <span>Inicio</span>
          </NuxtLink>
          <div class="nav-group">
            <div :class="{ active: catalogosOpen }" class="nav-item" @click="catalogosOpen = !catalogosOpen">
              <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"
                   xmlns="http://www.w3.org/2000/svg">
                <path d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" stroke-linecap="round"
                      stroke-linejoin="round"/>
              </svg>
              <span>Catálogos</span>
              <svg :class="{ open: catalogosOpen }" class="chevron" fill="none" stroke="currentColor"
                   stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M19.5 8.25l-7.5 7.5-7.5-7.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <div v-show="catalogosOpen" class="nav-submenu">
              <NuxtLink v-for="c in catalogos" :key="c.path" :class="{ active: isCatalogActive(c.path) }" :to="c.path"
                        class="nav-subitem" @click="closeSidebar">
                {{ c.label }}
              </NuxtLink>
            </div>
          </div>
          <NuxtLink active-class="active" class="nav-item" to="/valoracion" @click="closeSidebar">
            <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"
                 xmlns="http://www.w3.org/2000/svg">
              <path d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605" stroke-linecap="round"
                    stroke-linejoin="round"/>
            </svg>
            <span>Valoración de Activos</span>
          </NuxtLink>
          <NuxtLink active-class="active" class="nav-item" to="/plan-tratamiento" @click="closeSidebar">
            <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"
                 xmlns="http://www.w3.org/2000/svg">
              <path d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08A2.25 2.25 0 0110.5 6.108V8.25m0 .75v6.75m0-6.75h6.75m-6.75 0L9.75 15m5.25-6.75L15 15m-5.25 0h6.75m-6.75 0v6.75" stroke-linecap="round"
                    stroke-linejoin="round"/>
            </svg>
            <span>Plan de Tratamiento</span>
          </NuxtLink>
          <template v-if="tieneRol('administrador')">
            <NuxtLink active-class="active" class="nav-item" to="/parametrizacion" @click="closeSidebar">
              <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"
                   xmlns="http://www.w3.org/2000/svg">
                <rect x="3" y="3" width="18" height="18" rx="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M3 9h18M3 15h18M9 3v18" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span>Parametrización</span>
            </NuxtLink>
            <NuxtLink active-class="active" class="nav-item" to="/usuarios" @click="closeSidebar">
              <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"
                   xmlns="http://www.w3.org/2000/svg">
                <path d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" stroke-linecap="round"
                      stroke-linejoin="round"/>
              </svg>
              <span>Usuarios</span>
            </NuxtLink>
            <NuxtLink active-class="active" class="nav-item" to="/roles" @click="closeSidebar">
              <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"
                   xmlns="http://www.w3.org/2000/svg">
                <path d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span>Roles</span>
            </NuxtLink>
          </template>
          <NuxtLink active-class="active" class="nav-item" to="/auditoria" @click="closeSidebar">
            <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"
                 xmlns="http://www.w3.org/2000/svg">
              <path d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>Auditoría</span>
          </NuxtLink>
          <NuxtLink active-class="active" class="nav-item" to="/reportes/valoracion-activos" @click="closeSidebar">
            <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"
                 xmlns="http://www.w3.org/2000/svg">
              <path d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 7.5h3l3-3m0 0l3 3m-3-3v12" stroke-linecap="round"
                    stroke-linejoin="round"/>
            </svg>
            <span>Reportes</span>
          </NuxtLink>
        </nav>

        <div class="sidebar-footer">
          <button class="logout-sidebar-btn" @click="logout">
            <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"
                 xmlns="http://www.w3.org/2000/svg">
              <path d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" stroke-linecap="round"
                    stroke-linejoin="round"/>
            </svg>
            <span>Salir</span>
          </button>
        </div>
      </aside>

      <!-- Content Area -->
      <main class="content-area">
        <slot/>
      </main>

      <!-- Mobile Menu Toggle -->
      <button class="mobile-toggle" @click="isSidebarOpen = !isSidebarOpen">
        <svg v-if="!isSidebarOpen" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"
             xmlns="http://www.w3.org/2000/svg">
          <path d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <svg v-else fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"
             xmlns="http://www.w3.org/2000/svg">
          <path d="M6 18L18 6M6 6l12 12" stroke-linecap="round" stroke-linejoin="round"/>
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
