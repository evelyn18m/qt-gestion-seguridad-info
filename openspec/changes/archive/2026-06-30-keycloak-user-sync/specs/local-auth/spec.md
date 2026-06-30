# Delta for local-auth

## MODIFIED Requirements

### Requirement: Keycloak→Local Sync Interceptor

The system MUST intercept authenticated requests with Keycloak tokens and upsert a `Usuario` record by `keycloakSub`, syncing email, username, and roles. New syncs SHALL set `primerInicio: true`. The interceptor MUST be registered as an `APP_INTERCEPTOR` so it applies globally to all controllers.

(Previously: specified but not activated — `SyncInterceptor` was defined but never wired as `APP_INTERCEPTOR`, so auto-provisioning was inactive)

#### Scenario: First Keycloak login creates Usuario

- GIVEN no Usuario exists for token's `sub` claim
- WHEN a Keycloak-authenticated request is processed
- THEN a Usuario is created with `primerInicio: true`, email, and roles from token claims

#### Scenario: Subsequent Keycloak login updates

- GIVEN Usuario exists for `keycloakSub`
- WHEN Keycloak-authenticated request arrives
- THEN email and roles are refreshed from token claims; `primerInicio` unchanged
