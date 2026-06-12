import Keycloak from 'keycloak-js'

// Interval ID stored in module scope so it can be cleaned up on HMR
let tokenRefreshInterval: ReturnType<typeof setInterval> | null = null

export default defineNuxtPlugin(async () => {
    const keycloak = new Keycloak({
        url: 'http://localhost:8080',
        realm: 'quito-turismo',
        clientId: 'sgsi-app',
    })

    const loggedIn = ref(false)

    // Guard against double intervals during HMR (dev mode)
    if (tokenRefreshInterval) {
        clearInterval(tokenRefreshInterval)
        tokenRefreshInterval = null
    }

    try {
        await keycloak.init({
            onLoad: 'check-sso',
            silentCheckSsoRedirectUri: window.location.origin + '/silent-check-sso.html',
            pkceMethod: 'S256',
        })
        loggedIn.value = keycloak.authenticated ?? false
    } catch (e) {
        console.error('[keycloak] init failed', e)
    }

    // Auto-refresh token when it expires (reactive callback)
    keycloak.onTokenExpired = () => {
        keycloak.updateToken(30).catch(() => keycloak.logout())
    }

    // Background periodic refresh: checks token expiry every 60 seconds
    // and proactively refreshes even when the user is idle (no API calls).
    tokenRefreshInterval = setInterval(() => {
        if (!keycloak.authenticated || !keycloak.tokenParsed?.exp) return

        const now = Math.floor(Date.now() / 1000)
        const expiresIn = keycloak.tokenParsed.exp - now

        // If token expires within 60 seconds, proactively refresh
        if (expiresIn < 60) {
            keycloak.updateToken(30).catch(() => {
                // Refresh token also expired — clear interval and redirect to login
                if (tokenRefreshInterval) {
                    clearInterval(tokenRefreshInterval)
                    tokenRefreshInterval = null
                }
                keycloak.logout()
            })
        }
    }, 60000)

    // Cleanup on HMR
    if (import.meta.hot) {
        import.meta.hot.dispose(() => {
            if (tokenRefreshInterval) {
                clearInterval(tokenRefreshInterval)
                tokenRefreshInterval = null
            }
        })
    }

    return {
        provide: {
            keycloak,
            kcLoggedIn: loggedIn,
        },
    }
})
