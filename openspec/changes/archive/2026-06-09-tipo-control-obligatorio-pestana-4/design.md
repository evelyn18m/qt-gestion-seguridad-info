# Design: Tipo de Control obligatorio en Pestaña 4

## Technical Approach

Defensa en profundidad en 3 capas:
1. **Frontend**: `canAdvanceFromStep4()` valida `tipoControlId` en todas las `riskRows` antes de emitir `submit` desde el botón Guardar
2. **Backend**: `ValidationPipe` global activa `@IsNumber()` ya existente en `DetalleRiesgoDto.tipoControlId`
3. **Database**: `DetalleRiesgo.tipoControlId Int?` → `Int` (NOT NULL) con backfill previo de NULLs

## Architecture Decisions

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Validar en Guardar handler vs bloquear navegación a Tab 4 | Guardar es el punto de acción real; Tab 4 ES el final, no hay step 5 | Guardar handler inline |
| ValidationPipe global vs por-controller | Global activa TODAS las validaciones de DTOs que están muertas; riesgo medio mitigado con E2E | Global con whitelist+forbidNonWhitelisted+transform |
| Spread condicional → directo en service | Con ValidationPipe, `tipoControlId` siempre es number; el spread era defensa contra undefined | Asignación directa: `tipoControlId: d.tipoControlId` |
| DB migration con backfill vs skip DB | Integridad estructural; si hay NULLs se backfill con primer TipoControl del seed | Migrar con backfill previo |

## Data Flow

```
Usuario clic "Guardar" (Tab 4, step=3)
        │
        ▼
[FRONTEND] Guardar button @click handler
        │
        ├── canAdvanceFromStep4() itera riskRows
        │     └─ findMatchedDetalle(row)?.tipoControlId
        │       ├─ FAIL → alert("Complete Tipo de Control..."), return
        │       └─ PASS → emit('submit')
        │
        ▼
[FRONTEND] submitValoracion() en valoracion.vue
        │   tipoControlId: Number(d.tipoControlId)  // siempre presente
        │
        ▼
[HTTP] POST/PATCH /valoraciones → body con detallesRiesgo[]
        │
        ▼
[BACKEND] ValidationPipe global (main.ts)
        │   DetalleRiesgoDto.tipoControlId: @IsNumber() → required
        │   ├─ FAIL → HTTP 400 { message: [...], error: "Bad Request" }
        │   └─ PASS → controller
        │
        ▼
[BACKEND] ValoracionesService.create/update
        │   mapDetalleRiesgo: tipoControlId: d.tipoControlId (directo)
        │
        ▼
[DB] Prisma INSERT → DetalleRiesgo.tipoControlId Int NOT NULL
        │   ├─ violación → error 500 (nunca alcanzable con validación)
        │   └─ OK → 201/200
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `frontend/components/ValoracionModal.vue` | Modify | Agregar `canAdvanceFromStep4()` que itera `riskRows` verificando `tipoControlId`; gate en Guardar button handler |
| `frontend/pages/valoracion.vue` | Modify | Cambiar serialización línea 258: `d.tipoControlId ? Number(d.tipoControlId) : null` → `Number(d.tipoControlId)` |
| `backend/src/main.ts` | Modify | Agregar `app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))` después de `enableCors` |
| `backend/src/valoraciones/valoraciones.service.ts` | Modify | Línea 243: `...(d.tipoControlId !== undefined && { tipoControlId: d.tipoControlId })` → `tipoControlId: d.tipoControlId` |
| `backend/prisma/schema.prisma` | Modify | Línea 148: `tipoControlId Int?` → `tipoControlId Int` |
| `backend/prisma/migrations/` | New | Migración `make_tipo_control_id_required` con backfill SQL |
| `backend/src/valoraciones/valoraciones.service.spec.ts` | Modify | Actualizar mocks que usan `tipoControl: null`; agregar test de rejection 400 por falta de `tipoControlId` |

## Migration Strategy

1. Pre-backfill query:
```sql
SELECT COUNT(*) FROM DetalleRiesgo WHERE tipoControlId IS NULL;
```
2. Si count > 0, backfill:
```sql
UPDATE DetalleRiesgo SET tipoControlId = (SELECT MIN(id) FROM TipoControl) WHERE tipoControlId IS NULL;
```
3. Migración Prisma: `npx prisma migrate dev --name make_tipo_control_id_required`

## Error Handling

| Capa | Error | Respuesta |
|------|-------|-----------|
| Frontend | `tipoControlId` vacío en alguna fila | `alert("Complete el campo 'Tipo de Control' en todas las filas antes de guardar.")` — el modal permanece abierto |
| Backend ValidationPipe | `tipoControlId` ausente o no numérico | HTTP 400 `{ message: ["tipoControlId must be a number...", ...], error: "Bad Request", statusCode: 400 }` |
| Backend ValidationPipe | Campos no whitelisteados en el body | HTTP 400 `{ message: ["property X should not exist"], ... }` — requiere ajustar DTOs si aparecen |
| DB constraint | `tipoControlId IS NULL` en INSERT | Prisma constraint error → HTTP 500 (no debería ocurrir con validación activa) |

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit (DTO) | `DetalleRiesgoDto` rechaza sin `tipoControlId` | Ya existen tests RED/GREEN/TRIANGULATE (líneas 837-874). Sin cambios. |
| Unit (Service) | `create/update` con `tipoControlId` presente/nulo | Actualizar mocks: quitar `tipoControl: null`, agregar `tipoControlId` requerido. Verificar que spread condicional removido no rompe nada. |
| E2E (Backend) | POST/PATCH `/valoraciones` con ValidationPipe activo | Nuevo test: POST sin `tipoControlId` → 400. POST con `tipoControlId` → 201. Verificar que `forbidNonWhitelisted` no rompe endpoints existentes. |
| E2E (Backend) | Smoke test todos los endpoints | GET /catalogos/*, POST /valoraciones, GET /valoraciones/:id, PATCH, DELETE. Verificar que ningún endpoint devuelve 400 inesperado por `forbidNonWhitelisted`. |
| Smoke Manual (Frontend) | Guardar sin Tipo Control → bloqueado | Checklist: (1) Nueva valoración, completar tabs 1-3, en Tab 4 dejar Tipo Control vacío → clic Guardar → alert, modal sigue abierto. (2) Completar Tipo Control en todas las filas → clic Guardar → guarda OK. |

## Migration / Rollout

- **Backfill**: Ejecutar query pre-migración. Si hay NULLs, backfill con ID del primer `TipoControl`.
- **Rollback frontend**: Revertir `ValoracionModal.vue` y `valoracion.vue` a versión anterior.
- **Rollback backend**: Comentar `app.useGlobalPipes(...)` en `main.ts`.
- **Rollback DB**: `npx prisma migrate diff` para revertir `Int` → `Int?`; recrear migración de reversión.

## Open Questions

- [ ] ¿Existen campos "fantasma" en los payloads de otros endpoints que `forbidNonWhitelisted` rechazará? Verificar con E2E smoke test.
- [ ] ¿Cuántos registros en DB tienen `tipoControlId IS NULL`? Determina si el backfill es necesario.
