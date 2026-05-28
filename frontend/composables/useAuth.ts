import type { KeycloakTokenParsed } from 'keycloak-js'

export const useAuth = () => {
  const { $keycloak, $kcLoggedIn } = useNuxtApp()

  return {
    loggedIn: $kcLoggedIn as Ref<boolean>,
    user: computed(() => $keycloak.tokenParsed as KeycloakTokenParsed | undefined),
    token: computed(() => $keycloak.token),
    login: () => $keycloak.login(),
    logout: () => $keycloak.logout({ redirectUri: window.location.origin + '/' }),
  }
}
