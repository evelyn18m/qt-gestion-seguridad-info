# Proposal: Añadir campo Impacto CIA en Pestaña 4

## Intent

El usuario que trabaja en la Pestaña 4 (Tratamiento de Riesgo) necesita ver el impacto CIA sin tener que volver a la Pestaña 3. Actualmente el campo solo existe en Tab 3, obligando a navegación innecesaria entre pasos del wizard.

## Scope

### In Scope
- Replicar el bloque `<div class="form-group">` "Impacto CIA" de Tab 3 en Tab 4, entre el `<h3>` y la tabla

### Out of Scope
- Nueva lógica de negocio, computed, o llamadas API
- Columnas adicionales en la tabla de Tab 4
- Modificaciones en backend, estilos, o estructura del wizard

## Capabilities

### New Capabilities
None

### Modified Capabilities
None — cambio puramente de display, sin alterar comportamiento especificado

## Approach

Copy-paste exacto del bloque HTML de las líneas 783-786 de `ValoracionModal.vue` (Tab 3) entre el `<h3 class="val-card-title">` de Tab 4 (línea 854) y el `<div v-if="riskRows.length === 0">` (línea 855). `ciaAverage` computed y `getCiaLevel()` ya existen y son accesibles en el scope de Tab 4.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `frontend/components/ValoracionModal.vue` (línea 854-855) | Modified | +5 líneas de template insertadas en Tab 4 |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Ninguno — cambio aditivo sin modificación de lógica | N/A | Revertir las 5 líneas añadidas |

## Rollback Plan

Eliminar las 5 líneas insertadas. `git revert` del commit.

## Dependencies

Ninguna. `ciaAverage` (computed, líneas 116-123) y `getCiaLevel()` (función, líneas 460-464) ya están definidas y en uso.

## Success Criteria

- [ ] Tab 4 muestra el campo "Impacto CIA" idéntico al de Tab 3 (mismo label, mismo input readonly, misma lógica condicional)
- [ ] El campo se muestra tanto con `riskRows.length === 0` como con filas presentes
- [ ] Tab 3 permanece sin cambios y funcional
