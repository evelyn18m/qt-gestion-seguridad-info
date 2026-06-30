/**
 * Base API composable — provides authenticated fetch with proper error handling.
 * Uses runtimeConfig.apiBase for the base URL and injects Bearer token from Keycloak or local JWT.
 * Skips Keycloak token refresh for local sessions.
 */

export class SessionExpiredError extends Error {
  statusCode = 401
  code = 'SESSION_EXPIRED'

  constructor(message = 'Sesión expirada. Por favor, inicie sesión nuevamente.') {
    super(message)
    this.name = 'SessionExpiredError'
  }
}

export function useApi() {
  const config = useRuntimeConfig()
  const { token, isLocal } = useAuth()
  const { $keycloak } = useNuxtApp()

  async function apiFetch<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    // Only refresh Keycloak token for Keycloak sessions
    if (!isLocal.value) {
      try {
        await $keycloak.updateToken(30)
      } catch {
        throw new SessionExpiredError()
      }
    }

    const url = `${config.public.apiBase}${path}`
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    }

    // Inject Bearer token from either source
    const currentToken = token.value
    if (currentToken) {
      headers['Authorization'] = `Bearer ${currentToken}`
    }

    const res = await fetch(url, { ...options, headers })

    if (!res.ok) {
      let message = `HTTP ${res.status}`
      try {
        const body = await res.json().catch(() => null)
        if (body?.message) message = body.message
      } catch {
        /* ignore json parse errors */
      }
      if (res.status === 401) {
        throw new SessionExpiredError(message)
      }
      const err = new Error(message) as Error & { statusCode: number }
      err.statusCode = res.status
      throw err
    }

    // 204 No Content — successful but no body to parse
    if (res.status === 204) {
      return undefined as T
    }

    return res.json() as Promise<T>
  }

  return { apiFetch }
}
