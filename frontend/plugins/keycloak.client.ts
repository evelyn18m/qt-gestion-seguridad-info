import Keycloak from 'keycloak-js'

export default defineNuxtPlugin(async () => {
    const keycloak = new Keycloak({
        url: 'http://localhost:8080',
        realm: 'quito-turismo',
        clientId: 'sgsi-app',
    })

    const loggedIn = ref(false)

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

    // Auto-refresh token before it expires
    keycloak.onTokenExpired = () => {
        keycloak.updateToken(30).catch(() => keycloak.logout())
    }

    return {
        provide: {
            keycloak,
            kcLoggedIn: loggedIn,
        },
    }
})
