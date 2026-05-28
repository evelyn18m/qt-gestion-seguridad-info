/**
 * Base API composable — provides authenticated fetch with proper error handling.
 * Uses runtimeConfig.apiBase for the base URL and injects Bearer token from Keycloak.
 */
import type { ApiError } from '~/types/api'

export function useApi() {
  const config = useRuntimeConfig()
  const { token } = useAuth()

  async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${config.public.apiBase}${path}`
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    }

    // Inject Bearer token from Keycloak
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
      } catch { /* ignore json parse errors */ }
      const err = new Error(message) as Error & { statusCode: number }
      err.statusCode = res.status
      throw err
    }

    return res.json() as Promise<T>
  }

  return { apiFetch }
}