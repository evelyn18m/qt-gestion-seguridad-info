import type { KeycloakTokenParsed } from 'keycloak-js'
import type { Usuario, LoginResponse } from '~/types/api'

const LOCAL_TOKEN_KEY = 'auth_token'

export const useAuth = () => {
  const { $keycloak, $kcLoggedIn } = useNuxtApp()
  const config = useRuntimeConfig()

  // ── Local session state ──────────────────────────────────────────────
  const localToken = ref<string | null>(null)
  const localUsuario = ref<Usuario | null>(null)
  const primerInicio = ref(false)

  // Restore from sessionStorage on init
  if (import.meta.client) {
    const stored = sessionStorage.getItem(LOCAL_TOKEN_KEY)
    if (stored) {
      localToken.value = stored
    }
  }

  // ── Computed flags ───────────────────────────────────────────────────
  const isLocal = computed(() => localToken.value !== null)
  const isKeycloak = computed(
    () => ($kcLoggedIn as Ref<boolean>).value && $keycloak.authenticated,
  )

  const loggedIn = computed(() => isKeycloak.value || isLocal.value)

  // ── Token (source-agnostic) ──────────────────────────────────────────
  const token = computed(() => {
    if (isLocal.value && localToken.value) return localToken.value
    if (isKeycloak.value && $keycloak.token) return $keycloak.token
    return null
  })

  // ── Usuario (transforms Keycloak or returns local) ───────────────────
  const usuario = computed<Usuario | null>(() => {
    if (isLocal.value && localUsuario.value) return localUsuario.value

    const parsed = $keycloak.tokenParsed as Record<string, unknown> | undefined
    if (!parsed) return null

    const realmAccess = parsed['realm_access'] as
      | { roles: string[] }
      | undefined
    return {
      id: (parsed['sub'] as string) ?? '',
      keycloakSub: (parsed['sub'] as string) ?? null,
      username: (parsed['preferred_username'] as string) ?? '',
      email: (parsed['email'] as string) ?? '',
      primerInicio: false,
      habilitado: true,
      roles: JSON.stringify(realmAccess?.roles ?? []),
      createdAt: '',
      updatedAt: '',
    }
  })

  // ── Backward-compat alias (default.vue uses `user`) ──────────────────
  const user = computed(() => {
    const u = usuario.value
    if (!u) return undefined
    return {
      name: u.username,
      preferred_username: u.username,
      realm_access: {
        roles: (() => {
          try {
            return JSON.parse(u.roles)
          } catch {
            return []
          }
        })(),
      },
    } as unknown as KeycloakTokenParsed
  })

  // ── Keycloak login ───────────────────────────────────────────────────
  const login = () => $keycloak.login()

  // ── Local login ──────────────────────────────────────────────────────
  async function loginLocal(credentials: {
    username: string
    password: string
  }) {
    const res = await $fetch<LoginResponse>(
      `${config.public.apiBase}/auth/login`,
      {
        method: 'POST',
        body: credentials,
      },
    )

    localToken.value = res.access_token
    sessionStorage.setItem(LOCAL_TOKEN_KEY, res.access_token)
    localUsuario.value = {
      id: res.usuario.id,
      keycloakSub: null,
      username: res.usuario.username,
      email: res.usuario.email,
      primerInicio: false,
      habilitado: true,
      roles: JSON.stringify(res.usuario.roles),
      createdAt: '',
      updatedAt: '',
    }
    primerInicio.value = false

    // Check if primerInicio flag came through
    if (res.usuario.primerInicio) {
      primerInicio.value = true
    }
  }

  // ── Set password ─────────────────────────────────────────────────────
  async function setPassword(password: string) {
    await $fetch(`${config.public.apiBase}/auth/set-password`, {
      method: 'POST',
      body: { password },
      headers: {
        Authorization: `Bearer ${token.value}`,
      },
    })
    primerInicio.value = false
    if (localUsuario.value) {
      localUsuario.value.primerInicio = false
    }
  }

  // ── Unified logout ───────────────────────────────────────────────────
  function logout() {
    if (isKeycloak.value) {
      $keycloak.logout({ redirectUri: window.location.origin + '/' })
    }
    localToken.value = null
    localUsuario.value = null
    sessionStorage.removeItem(LOCAL_TOKEN_KEY)
    if (!isKeycloak.value) {
      navigateTo('/login')
    }
  }

  return {
    loggedIn,
    user,
    usuario,
    token,
    primerInicio,
    login,
    loginLocal,
    setPassword,
    logout,
    isLocal,
    isKeycloak,
  }
}
