# Proposal: CRUD Tabla de Usuario (Backend + Frontend)

## Intent

La página `/usuarios` solo lista usuarios — no hay formularios para crear, editar ni eliminar. Además, `create()` no genera contraseña, por lo que usuarios creados vía CRUD tienen `passwordHash: null` y no pueden loguearse localmente. Este cambio cierra ambas brechas: backend genera contraseña en create, frontend expone UI CRUD completa.

## Scope

### In Scope
- **Backend `create()`**: genera contraseña aleatoria (`crypto.randomBytes`), hashea con bcrypt (`hash(x, 10)`), guarda `passwordHash` + `primerInicio: true`, retorna `{ usuario, contraseñaGenerada }`
- **Backend tests**: RED + TRIANGULATE para generación de contraseña, hash bcrypt verificado, unicidad entre llamadas, nuevo shape de respuesta
- **Frontend**: modal crear (username, email + banner con contraseña generada y botón copiar), modal editar (email, habilitado, roles), botón eliminar con confirmación, refresco post-mutación, errores visibles

### Out of Scope
- class-validator en DTOs (validación en frontend)
- Guards por rol (cualquier autenticado puede CRUD)
- Paginación / búsqueda
- Test runner frontend (smoke test manual)
- Cambios en update/delete del backend

## Capabilities

### New Capabilities
- `usuarios-crud-frontend`: UI CRUD completa sobre tabla `Usuario` — crear (con contraseña generada), editar campos, eliminar, toggle habilitado, refresco post-mutación, errores visibles

### Modified Capabilities
- `local-usuarios-crud`: `POST /usuarios` ahora genera contraseña aleatoria, la hashea con bcrypt, y responde `{ usuario, contraseñaGenerada }` en lugar de solo `Usuario`

## Approach

**Backend**: `crypto.randomBytes(16).toString('hex')` genera 32-char password. `bcrypt.hash(password, 10)` sigue patrón exacto de `auth.service.ts`. `create()` retorna `{ usuario: {...}, contraseñaGenerada: rawPassword }`. Controller ajusta tipo de retorno; DTO no cambia (sigue aceptando solo username, email).

**Frontend**: Patrón `catalogos.vue` — modal overlay con `.modal-overlay` + `.modal-box`. Mutaciones vía `useApi().apiFetch('/usuarios[/:id]', { method, body })`. Post-create: banner verde con contraseña + botón copiar (`navigator.clipboard.writeText`). Delete: confirmación con ref `catalogoConfirmDelete`. Refresco: `fetchUsuarios()` post-mutación.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/src/usuarios/usuarios.service.ts` | Modified | create() genera password, hashea, retorna objeto compuesto (+15 líneas) |
| `backend/src/usuarios/usuarios.service.spec.ts` | Modified | RED + TRIANGULATE para password (+30 líneas) |
| `backend/src/usuarios/usuarios.controller.ts` | Modified | Ajustar tipo retorno create (el DTO no cambia) |
| `frontend/pages/usuarios.vue` | Modified | Modales create/edit/delete, handlers, estilos (+250 líneas) |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Contraseña plaintext en respuesta HTTP | Med | Aceptable: admin crea usuario y entrega contraseña out-of-band. HTTPS en producción. |
| Sin class-validator → errores 500 genéricos | Med | Validar en frontend (campos requeridos, formato email) |
| Cualquier autenticado puede crear/eliminar | Med | Sin mitigación inmediata. Futuro: guards por rol. |
| Frontend sin tests automatizados | High | Smoke test manual. Documentar pasos de verificación. |
| `roles: '[]'` hardcodeado en create | Low | Consistente con comportamiento actual. Edit asigna roles post-creación. |

## Rollback Plan

Revertir `usuarios.service.ts`, `usuarios.service.spec.ts`, `usuarios.controller.ts` y `usuarios.vue` vía `git checkout`. Sin migraciones ni cambios de BD. Usuarios ya creados con `passwordHash` mantienen su contraseña.

## Dependencies

- `bcrypt` ya importado en backend (auth.service.ts); `crypto` es módulo nativo Node — sin nuevas dependencias
- Backend endpoints funcionando (17 tests pasan)
- `useApi()` composable disponible en frontend

## Success Criteria

- [ ] `POST /usuarios` con `{ username, email }` retorna `{ usuario: {...}, contraseñaGenerada: "a1b2c3..." }`
- [ ] `usuario.passwordHash` hasheado con bcrypt (verificable con `bcrypt.compare`)
- [ ] `usuario.primerInicio === true`
- [ ] Dos create consecutivos generan contraseñas diferentes
- [ ] Backend tests pasan (~13 tests: 9 existentes + 4 nuevos)
- [ ] Botón "+ Nuevo" abre modal; crear muestra contraseña con botón copiar
- [ ] Botón editar por fila abre modal con email, habilitado toggle, roles textarea; PATCH funciona
- [ ] Botón eliminar muestra confirmación; DELETE funciona
- [ ] Tabla se refresca post-mutación; errores API visibles al usuario
