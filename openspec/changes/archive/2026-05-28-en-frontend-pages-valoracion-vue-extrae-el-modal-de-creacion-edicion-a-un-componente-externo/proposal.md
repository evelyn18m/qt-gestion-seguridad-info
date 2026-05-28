# Proposal: Extraer modal de creación/edición a componente externo

## Intent
El modal de creación/edición en `frontend/pages/valoracion.vue` (líneas 781-1171) está acoplado directamente al script de la página. Esto impide reutilización y dificulta el mantenimiento. El objetivo es extraerlo como componente Vue independiente (`ValoracionModal.vue`) que pueda ser consumido desde la página manteniendo la funcionalidad intacta.

## Scope

### In Scope
- Crear `frontend/components/ValoracionModal.vue` con los 4 tabs actuales
- Mover estado del modal (showModalVal, valEditId, activeTab) a props/emit
- Mantener toda la lógica de negocio (submit, edit, reset, rebuildDetalles, etc.) compatible
- Reemplazar el bloque modal inline en `valoracion.vue` por `<ValoracionModal />`

### Out of Scope
- Refactorizar lógica de negocio a composables (futuro)
- Reutilizar el modal en otra página (se resuelve en otro cambio)
- Agregar tests unitarios (frontend sin test runner)

## Capabilities

### New Capabilities
- `valoracion-modal`: Componente Vue independiente que renderiza el modal de creación/edición de activos con 4 tabs (Identificación+CIA, Análisis de Riesgos, Evaluación, Tratamiento)

### Modified Capabilities
- Ninguno (es extracción pura sin cambio de comportamiento)

## Approach
Extraer el modal como **componente con props/emit** (no slots inicialmente dado que no hay patrón establecido):
- Props: `modelValue` (show), `editId` (edición), catalog data, form data
- Emit: `update:modelValue`, `save`, `cancel`
- La página mantiene el estado y pasa datos al componente
- El componente solo renderiza y transmite eventos

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `frontend/pages/valoracion.vue` | Modified | Reemplaza bloque modal inline por `<ValoracionModal />`, pasa props |
| `frontend/components/ValoracionModal.vue` | New | Componente extraído con 4 tabs y lógica de presentación |
| `openspec/changes/{change}/proposal.md` | New | Este documento |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Breaking edit flow | Medium | Probar manualmente edit + save de valoración existente antes de cerrar |
| Form state diverge | Medium | Mantener相同的reset/submit logic en ambos archivos; verificar con datos reales |
| CIA promedio pierde sync | Low | ciaAverage computado de valForm se pasa como prop al componente |

## Rollback Plan
1. Eliminar `frontend/components/ValoracionModal.vue`
2. Restaurar bloque modal inline en `valoracion.vue` (git revert del commit)
3. Verificar que create/edit/save de valoración funciona igual que antes

## Dependencies
- Ninguna dependencia externa

## Success Criteria
- [ ] Crear nueva valoración funciona igual que antes
- [ ] Editar valoración existente pre-popula todos los campos correctamente
- [ ] Los 4 tabs muestran y guardan datos correctamente
- [ ] El modal se cierra después de guardar
- [ ] No hay errores en consola ni en backend