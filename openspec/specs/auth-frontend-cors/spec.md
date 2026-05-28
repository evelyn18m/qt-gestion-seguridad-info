# Auth Frontend CORS — Origin Lock

## Metadata
- change: corregir-auth-oidc
- domain: auth-frontend-cors
- type: spec
- status: active

---

## ADDED Requirements

### Requirement: CORS locked to localhost:3000

The backend MUST enforce CORS such that only `http://localhost:3000` is permitted to make cross-origin requests to API endpoints.

#### Scenario: Frontend cross-origin API call

- GIVEN a Vue component in the frontend at `http://localhost:3000` makes a `fetch()` call to `http://localhost:3001/api/valoraciones`
- WHEN the browser sends the preflight OPTIONS request
- THEN the response MUST include `Access-Control-Allow-Origin: http://localhost:3000`

#### Scenario: Non-allowed origin preflight

- GIVEN a request from `http://external-site.com` reaches the backend
- WHEN the CORS middleware evaluates the origin
- THEN the response MUST NOT include `Access-Control-Allow-Origin` header
- AND the request SHALL be rejected
