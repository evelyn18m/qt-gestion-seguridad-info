// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  modules: ['nuxt-oidc-auth'],
  css: ['~/assets/css/main.css'],
  oidc: {
    defaultProvider: 'keycloak',
    providers: {
      keycloak: {
        baseUrl: 'http://localhost:8080',
        realm: 'quito-turismo',
        clientId: 'sgsi-app',
        redirectUri: 'http://localhost:3000',
        postLogoutRedirectUri: 'http://localhost:3000',
      }
    },
    middleware: {
      globalMiddlewareEnabled: false
    }
  },
})
