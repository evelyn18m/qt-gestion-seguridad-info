# Keycloak Configuration

## Realm Import

After modifying `realm-export.json`, re-import into Keycloak:

1. Open Keycloak Admin Console at `http://localhost:8080`
2. Login as `admin` / `admin`
3. Select realm `quito-turismo`
4. Go to **Manage → Import** in the sidebar
5. Upload `realm-export.json` and confirm
6. All client settings, roles, and users will be updated

## Client: sgsi-app

Key configuration for Authorization Code + PKCE flow:

| Setting | Value |
|---------|-------|
| `standardFlowEnabled` | `true` (enables authorization code flow) |
| `directAccessGrantsEnabled` | `false` (password grant disabled) |
| `clientAuthenticatorType` | `client-secret` (secret stays in Keycloak) |
| `redirectUris` | `["http://localhost:3000/*"]` |
| `webOrigins` | `["http://localhost:3000"]` |
| `post.logout.redirect.uris` | `["http://localhost:3000/*"]` |

## Notes

- The client secret (`2AbmJS1ok5t52CKqUqUwoovk2wQDGWPC`) never leaves the browser with Authorization Code + PKCE. PKCE ensures the code exchange is bound to the initiating browser.
- If the realm is re-imported, the `sgsi-app` client will be recreated with the `realm-export.json` values.