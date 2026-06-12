import type { KeycloakTokenParsed } from 'keycloak-js'

export interface SessionState {
    secondsRemaining: number | null
    isWarning: boolean
    isExpired: boolean
    isRefreshing: boolean
}

/**
 * Composable that tracks Keycloak token expiry and provides
 * reactive state for UI warnings and session management.
 */
export function useSession() {
    const { $keycloak } = useNuxtApp()
    const state = reactive<SessionState>({
        secondsRemaining: null,
        isWarning: false,
        isExpired: false,
        isRefreshing: false,
    })

    let timer: ReturnType<typeof setInterval> | null = null

    function recalculate() {
        const exp = ($keycloak.tokenParsed as KeycloakTokenParsed | undefined)?.exp
        if (!exp) {
            state.secondsRemaining = null
            state.isWarning = false
            state.isExpired = false
            return
        }

        const now = Math.floor(Date.now() / 1000)
        const remaining = exp - now

        state.secondsRemaining = Math.max(0, remaining)
        state.isWarning = remaining <= 60 && remaining > 0
        state.isExpired = remaining <= 0
    }

    onMounted(() => {
        recalculate()
        timer = setInterval(recalculate, 1000)
    })

    onUnmounted(() => {
        if (timer) {
            clearInterval(timer)
            timer = null
        }
    })

    async function refreshSession() {
        if (state.isRefreshing) return
        state.isRefreshing = true
        try {
            await $keycloak.updateToken(30)
            recalculate()
        } catch {
            state.isExpired = true
            throw new Error('Sesión expirada. Por favor, inicie sesión nuevamente.')
        } finally {
            state.isRefreshing = false
        }
    }

    return {
        ...toRefs(state),
        refreshSession,
    }
}
