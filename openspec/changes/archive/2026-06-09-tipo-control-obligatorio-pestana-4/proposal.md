# Proposal: Tipo de Control obligatorio en Pestaña 4

## Intent

El campo "Tipo de Control" en la Pestaña 4 (Tratamiento de Riesgo) tiene indicadores visuales de error pero **no bloquea** el envío. Los usuarios guardan valoraciones con `tipoControlId` vacío, generando datos incompletos. El backend tampoco valida porque `main.ts` no tiene `ValidationPipe`. Se implementa defensa en profundidad: bloqueo frontend + validación backend + constraint DB.

## Scope

### In Scope
- **Frontend**: `canAdvanceFromStep4()` que valide `tipoControlId` en todas las filas antes de emitir `submit`
- **Backend**: Activar `ValidationPipe` global (`whitelist`, `forbidNonWhitelisted`, `transform`)
- **Database**: `DetalleRiesgo.tipoControlId Int?` → `Int` (NOT NULL) con backfill de NULLs existentes
- **Service**: Simplificar spread condicional → asignación directa `tipoControlId: d.tipoControlId`

### Out of Scope
- `ValoracionActivo.tipoControl` (campo separado, nivel global)
- Otros campos opcionales del formulario
- Frontend tests (sin test runner)

## Capabilities

### Modified Capabilities
- `valoracion-modal`: El flujo Submit en Step 4 ahora requiere validación de `tipoControlId` antes de emitir; se agrega `canAdvanceFromStep4()`

## Approach

**Frontend** (`ValoracionModal.vue`): función `canAdvanceFromStep4()` que itera `riskRows`, verifica `findMatchedDetalle(row)?.tipoControlId`, muestra alerta si incompleto. Se llama como guard en el botón "Guardar" (Step 4).

**Backend** (`main.ts`): `app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))`. El DTO `DetalleRiesgoDto.tipoControlId` ya es `@IsNumber()` sin `@IsOptional()` — se activa automáticamente.

**Service** (`valoraciones.service.ts` línea 243): cambiar `...(d.tipoControlId !== undefined && { tipoControlId: d.tipoControlId })` a `tipoControlId: d.tipoControlId`.

**Database**: Migración `Int?` → `Int`. Antes: `SELECT COUNT(*) FROM DetalleRiesgo WHERE tipoControlId IS NULL`. Si hay NULLs, backfill con ID del primer `TipoControl` del catálogo.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `frontend/components/ValoracionModal.vue` | Modified | `canAdvanceFromStep4()` + guard en Guardar |
| `backend/src/main.ts` | Modified | `ValidationPipe` global |
| `backend/src/valoraciones/valoraciones.service.ts` | Modified | Asignación directa `tipoControlId` |
| `backend/prisma/schema.prisma` | Modified | `Int?` → `Int` |
| `backend/prisma/migrations/` | New | Migración NOT NULL |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `ValidationPipe` global rompe endpoints con campos no declarados | Medium | E2E tests completos; corregir DTOs si hay campos fantasmas |
| Migración falla por NULLs existentes | Medium | Verificar con query antes de migrar; backfill si necesario |
| `whitelist` + `forbidNonWhitelisted` causa 400 en endpoints legacy | Low | Los DTOs existentes ya tienen decorators `class-validator` |

## Rollback Plan
- **Frontend**: Revertir `ValoracionModal.vue`
- **Backend**: Remover/comentar `app.useGlobalPipes(...)` en `main.ts`
- **DB**: `npx prisma migrate diff` de `Int` → `Int?`

## Dependencies
- Backfill de datos existentes debe ejecutarse ANTES de la migración DB
- E2E tests deben pasar con `ValidationPipe` activo

## Success Criteria
- [ ] "Guardar" en Pestaña 4 bloquea si `tipoControlId` vacío en alguna fila
- [ ] Backend rechaza `detallesRiesgo[]` sin `tipoControlId` con HTTP 400
- [ ] `DetalleRiesgo.tipoControlId` es NOT NULL en DB
- [ ] Tests backend pasan (`npm run test` + `npm run test:e2e`)
- [ ] Smoke test manual frontend: sin tipo control → bloqueado; completo → guarda OK
