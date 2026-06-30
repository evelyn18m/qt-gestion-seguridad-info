# Delta for local-usuarios-crud

## MODIFIED Requirements

### Requirement: Full CRUD on /usuarios

The system MUST provide `GET`, `POST`, `PATCH`, and `DELETE` on `/usuarios` operating on the local `Usuario` table. Endpoints MUST be protected by the composite JWT guard. The `passwordHash` field SHALL NOT appear in any response. On user creation via `POST /usuarios`, the system MUST generate a 32-character random hex password, hash it with bcrypt (cost factor 10), store the hash, set `primerInicio: true`, and return `{ usuario, contraseñaGenerada }`.

(Previously: Created usuario with `passwordHash: null` and responded with just the Usuario object. No password generation.)

#### Scenario: List usuarios

- GIVEN authenticated request
- WHEN `GET /usuarios`
- THEN respond 200 with array of Usuario objects (no passwordHash)

#### Scenario: Create usuario with auto-generated password

- GIVEN authenticated request with `{ username, email }`
- WHEN `POST /usuarios`
- THEN usuario created with `passwordHash` set (bcrypt-hashed)
- AND `primerInicio: true`
- AND response 201 with `{ usuario: { id, username, email, habilitado, roles, primerInicio }, contraseñaGenerada: "<32-char-hex>" }`
- AND `contraseñaGenerada` differs across consecutive calls (randomness)

#### Scenario: Generated password is bcrypt-verifiable

- GIVEN a successful `POST /usuarios` returning `contraseñaGenerada`
- WHEN comparing `contraseñaGenerada` against stored `passwordHash` via `bcrypt.compare`
- THEN comparison succeeds

#### Scenario: passwordHash never returned by GET

- GIVEN a created usuario
- WHEN `GET /usuarios` or `GET /usuarios/:id`
- THEN response object SHALL NOT contain `passwordHash`

#### Scenario: Update usuario

- GIVEN authenticated request
- WHEN `PATCH /usuarios/:id` with `{ email, habilitado, roles }`
- THEN Usuario is updated, respond 200

#### Scenario: Delete usuario

- GIVEN authenticated request
- WHEN `DELETE /usuarios/:id`
- THEN Usuario is removed, respond 204

## ADDED Requirements

None.

## REMOVED Requirements

None.
