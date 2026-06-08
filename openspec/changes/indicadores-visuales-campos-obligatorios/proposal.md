# Proposal: Indicadores Visuales para Campos Obligatorios

## Intent

Los 6 campos requeridos de la Pestaña 1 ya se validan en 4 capas (HTML required + JS canAdvanceFromStep1 + NestJS DTO + Prisma NOT NULL), pero la UX es deficiente: cero indicadores visuales. El único feedback es un `alert()` genérico que no le dice al usuario CUÁLES campos están vacíos. Solución: asteriscos rojos, bordes rojos condicionales y mensajes de error inline por campo.

## Scope

### In Scope
- Asterisco rojo (`*`) en labels de 6 campos: macroProceso, descripcion, formato, propietario, custodio, ubicacion
- Borde rojo condicional (`border-color: #dc2626`) al intentar avanzar con campos vacíos
- Mensaje inline "Este campo es obligatorio" debajo de cada campo vacío
- Reemplazar `alert()` genérico por scroll al primer campo con error
- Limpiar errores al reintentar avance exitoso

### Out of Scope
- Modificar `canAdvanceFromStep1()` — la validación funciona, solo falta la UI
- Backend, DTO, schema Prisma, otras pestañas (Steps 2–4)

## Capabilities

### Modified Capabilities
- `valoracion-modal`: El escenario "Step 1 to Step 2 gate" cambia: en vez de `alert()` genérico, el sistema muestra errores inline por campo con borde rojo y scrollea al primer campo vacío. La lista de campos requeridos no cambia.

### New Capabilities
None — UX enhancement de comportamiento existente.

## Approach

**Script**: Reactive `fieldErrors: Record<string, string>` + modificar `nextStep()` para poblar errores sin `alert()` + `scrollToFirstError()` con `scrollIntoView({behavior:'smooth', block:'center'})`.

**Template**: `<span class="required-asterisk">*</span>` en cada label + `:class="{'has-error': fieldErrors.fieldName}"` en `.form-group` + `<span class="field-error" v-if="fieldErrors.fieldName">Este campo es obligatorio</span>`.

**Style**: Tres clases scoped: `.required-asterisk` (color red), `.has-error input/select/textarea` (border red), `.field-error` (small red text).

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `ValoracionModal.vue` — script | Modified | `fieldErrors` state, `nextStep()` logic, `scrollToFirstError()` |
| `ValoracionModal.vue` — template | Modified | 6 `.form-group` blocks (asterisks + error spans + class bindings) |
| `ValoracionModal.vue` — style | Modified | 3 nuevas clases CSS scoped |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `scrollIntoView` falla dentro del scroll container del modal | Low | Usar `block:'center'` + fallback a `parentNode.scrollTop` |
| Errores no se limpian al corregir campos | Low | Limpiar `fieldErrors` al inicio de `nextStep()` antes de re-validar |

## Rollback Plan

`git revert` del commit. Sin migraciones ni cambios de schema.

## Dependencies

None. Cambio autónomo, un solo archivo.

## Success Criteria

- [ ] Los 6 campos muestran asterisco rojo junto a su label
- [ ] Al hacer clic en "Siguiente" sin completar, NO aparece `alert()` — en su lugar: borde rojo + mensaje "Este campo es obligatorio" en cada campo vacío
- [ ] Scroll automático al primer campo con error
- [ ] Errores inline desaparecen al completar los campos y reintentar avance
- [ ] Campos completos no muestran indicador de error
- [ ] Flujo normal (todos completos) avanza sin cambios
