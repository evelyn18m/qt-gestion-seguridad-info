# Spec: Audit Logging System

## Purpose
Greenfield audit infrastructure for SGSI compliance: track **who** did **what**, **when**, from **which device**, and **what changed**.

---

## ADDED Requirements

### 1. audit-login

**R1.1** Frontend MUST call `POST /audit/login` after Keycloak init succeeds, with `userId` (sub), `userAgent`, `clientIP`.
**R1.2** System MUST persist login events to `AuditLog` (`accion=login`, `modulo=auth`).
**R1.3** Audit write failure MUST NOT block login (fire-and-forget, try/catch).

| # | GIVEN | WHEN | THEN |
|---|-------|------|------|
| S1.1 | Unauthenticated user | Keycloak login succeeds | `AuditLog` row: accion=login, userId, userAgent, IP |
| S1.2 | User cancels Keycloak | Auth fails | No audit entry created |
| S1.3 | Client without User-Agent header | Keycloak init succeeds | `dispositivo`=null; login row still created |
| S1.4 | DB unreachable during audit write | Login succeeds | Login completes; audit error caught silently |

**Acceptance**: Manual login → row visible. Failed login → no row. Null user-agent → handled. DB error → login unaffected.

---

### 2. audit-frontend-pages

**R2.1** Nuxt plugin MUST listen to `useRouter().afterEach` and POST `/api/audit/page-visit` per route.
**R2.2** Each entry MUST include `path`, `userId`, `userAgent`, `clientIP`.
**R2.3** Rapid SPA navigation MUST produce independent `AuditLog` rows per route change.

| # | GIVEN | WHEN | THEN |
|---|-------|------|------|
| S2.1 | Authenticated user on `/valoraciones` | Navigates to `/reportes` | Audit row: modulo=frontend, entidad=page-visit, detalles={path:"/reportes"} |
| S2.2 | User clicks navbar 3x in 1s | Three route changes fire | 3 independent rows, each with correct timestamp |
| S2.3 | No active Keycloak session | No audit request sent | null-safe: no row created |

**Acceptance**: Each route change → POST to backend. Rapid clicks → 3 entries. No session → no request.

---

### 3. audit-backend-endpoints

**R3.1** Global NestJS interceptor MUST capture every API request: method, path, userId, IP, userAgent, status, durationMs.
**R3.2** Interceptor SHALL skip `GET /health` and static asset paths.
**R3.3** Audit write failure MUST NOT block the response (fire-and-forget).

| # | GIVEN | WHEN | THEN |
|---|-------|------|------|
| S3.1 | User with JWT calls `GET /valoraciones` | Request completes (200) | Audit row: modulo=api, accion=REQUEST, detalles={method,path,status,durationMs,userId,userAgent} |
| S3.2 | Anonymous hits `GET /health` | Health check responds | No audit entry (excluded path) |
| S3.3 | AuditLog table locked | `GET /valoraciones` returns 200 | Response unaffected; audit error → console only |
| S3.4 | Anonymous calls unprotected `/api/catalogos/amenazas` | Request succeeds (200) | userId=null; audit still logged |

**Acceptance**: Any API request → row. Health → no row. DB error → 200 response unaffected. Anonymous → null userId.

---

### 4. audit-asset-crud

**R4.1** Asset creation MUST log `accion=CREAR` with `createdBy` attribution on `ValoracionActivo`.
**R4.2** Asset update MUST compute field-level diff (old→new) and store in `AuditLog.detalles` as JSON (@db.Text).
**R4.3** If no fields changed, the system MUST still log the update with empty diff `{}`.
**R4.4** Large diffs (35+ fields) MUST be stored fully in `@db.Text`, never truncated.
**R4.5** Concurrent updates MUST each produce an independent audit entry.

| # | GIVEN | WHEN | THEN |
|---|-------|------|------|
| S4.1 | Auth user with JWT | `POST /valoraciones` creates asset | Audit row: accion=CREAR; `ValoracionActivo.createdBy` populated |
| S4.2 | Asset has `criticidad='Alta'` | `PATCH` sets `criticidad='Media', riesgoInherente=4` | detalles={criticidad:{old:"Alta",new:"Media"}, riesgoInherente:{old:null,new:4}} |
| S4.3 | Same asset; DTO identical to DB | `PATCH /valoraciones/:id` | Audit row: accion=ACTUALIZAR, detalles={} |
| S4.4 | Two users patch same asset | Both PATCHes processed | 2 independent rows, each with own timestamp + userId |
| S4.5 | 35 fields changed | Update succeeds | Full JSON diff in detalles (Text); no truncation |

**Acceptance**: Create → row + createdBy. Update → field diff in JSON. No-change update → empty diff. Concurrent → 2 rows. 35-field diff → full.

---

### 5. audit-report-exports

**R5.1** System MUST log every XLSX export: `userId`, `tipo` (report type), `filtros`, `userAgent`.
**R5.2** All 4 export endpoints MUST produce audit entries (heatmap, eval-riesgo, tratamiento-riesgo, inventario).

| # | GIVEN | WHEN | THEN |
|---|-------|------|------|
| S5.1 | User on reportes; `criticidad=Alta` filter | `GET /reportes/heatmap/xlsx?...` | Audit row: modulo=reportes, accion=EXPORTAR, detalles={tipo:"heatmap", filtros:{criticidad:"Alta"}} |
| S5.2 | User selects multiple filters | Downloads XLSX | All filter params in detalles JSON |
| S5.3 | No valid JWT | Request to export endpoint | 401 from AuthGuard; no audit entry |

**Acceptance**: Download → audit row with correct tipo + filtros. All 4 tipos loggeados. No auth → 401.

---

### 6. user-context-propagation

**R6.1** `@CurrentUser()` decorator MUST extract JWT claims (`sub`, `email`, `preferred_username`) from `request.user`.
**R6.2** If no valid JWT, decorator MUST return null (not throw).
**R6.3** Controllers MAY pass user to services for attribution.

| # | GIVEN | WHEN | THEN |
|---|-------|------|------|
| S6.1 | Valid JWT in Authorization header | Controller uses `@CurrentUser() user` | user={sub, email, preferred_username} |
| S6.2 | No Authorization header | Controller uses `@CurrentUser() user` | user=null; no exception |
| S6.3 | Tampered/expired token | AuthGuard returns 401 | Decorator never reached |
| S6.4 | Asset creation in ValoracionesService | `create(dto, user)` called | createdBy=user.preferred_username |

**Acceptance**: Authenticated → JWT claims. No JWT → null. Expired → 401 before decorator. Service receives user.

---

## Edge Case Coverage

| Edge Case | Spec Ref |
|-----------|----------|
| JWT invalid/missing → decorator=null, AuthGuard blocks | S6.2, S6.3 |
| No fields changed → empty diff, audit still logged | S4.3 |
| Interceptor excluded paths (health, static) → skipped | S3.2 |
| AuditLog write fails → fire-and-forget, primary op unaffected | S1.4, S3.3 |
| Concurrent asset updates → independent entries each | S4.4 |
| Missing user-agent → dispositivo=null, not error | S1.3 |
| Rapid SPA navigation → independent row per route change | S2.2 |
| Large diffs (35+ fields) → stored as JSON in @db.Text | S4.5 |
