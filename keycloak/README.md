# Keycloak Configuration

## Realm: quito-turismo

### Import / Update

After modifying `realm-export.json`, re-import into Keycloak:

1. Open Keycloak Admin Console at `http://localhost:8080`
2. Login as `superadmin` / `admin` (bootstrap admin from `docker-compose.yml`)
3. Select realm `quito-turismo`
4. Go to **Manage → Import** in the sidebar
5. Upload `realm-export.json` and confirm
6. All client settings, roles, and users will be updated

## Client: sgsi-app

Public client using Authorization Code + PKCE flow.

| Setting | Value |
|---------|-------|
| `protocol` | `openid-connect` |
| `clientAuthenticatorType` | `client-jwt` (JWT signed by client keypair) |
| `publicClient` | `true` |
| `standardFlowEnabled` | `true` (enables authorization code + PKCE) |
| `implicitFlowEnabled` | `false` |
| `directAccessGrantsEnabled` | `false` |
| `serviceAccountsEnabled` | `false` |
| `frontchannelLogout` | `true` |
| `redirectUris` | `["http://localhost:3000/*"]` |
| `webOrigins` | `["http://localhost:3000"]` |
| `post.logout.redirect.uris` | `["http://localhost:3000/*"]` |

## Roles

| Role | Description | Users |
|------|-------------|-------|
| `administradoregsi` | Administrator of SGSI App | `admin` |
| `usuarioegsi` | Regular user of SGSI App | `user` |

## Users

| Username | Password | Role |
|----------|----------|------|
| `admin` | `admin123` | `administradoregsi` |
| `user` | `user123` | `usuarioegsi` |

## Notes

- This is a **public client** — no client secret. PKCE binds the auth code to the initiating browser.
- The `client-jwt` authenticator type means the client uses a JWT keypair for client authentication (service account flow if enabled in the future).
- Re-importing the realm will reset `sgsi-app` client to match `realm-export.json` values.
- Backend JWT validation uses JWKS from: `http://keycloak:8080/realms/quito-turismo/protocol/openid-connect/certs`