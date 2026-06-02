## Exploration: Añadir campo de Impacto CIA en Pestaña 4 (Tratamiento de Riesgo)

### Current State

**Tab 3 (Evaluación de Riesgo)** ya tiene el campo de impacto CIA — un `<div class="form-group">` con un `<input readonly>` que muestra el promedio CIA y su nivel textual (Alto/Medio/Bajo). Está ubicado entre el título `<h3>` y el mensaje de estado vacío/tabla (líneas 783-786 de `ValoracionModal.vue`):

```html
<div class="form-group">
  <label>Impacto (Extraído de Valoración CIA - Pestaña 1)</label>
  <input type="text" :value="ciaAverage > 0 ? ciaAverage.toFixed(2) + ' — ' + getCiaLevel(ciaAverage) : 'Complete Valoración CIA en Pestaña 1'" readonly style="background:rgba(15,23,42,0.3); cursor:not-allowed;" />
</div>
```

**Tab 4 (Tratamiento de Riesgo)** NO tiene este campo. Comienza directamente con el `<h3>` y luego el mensaje de estado vacío o la tabla (líneas 851-856):

```html
<!-- TAB 4: Tratamiento de Riesgo -->
<div v-show="currentStep === 3" class="val-tab-panel">
  <div class="val-card">
    <h3 class="val-card-title">Tratamiento de Riesgo — por Fila</h3>
    <div v-if="riskRows.length === 0" class="chip-empty">...</div>
    <table v-else class="val-table">...</table>
  </div>
</div>
```

### Affected Areas

- **`frontend/components/ValoracionModal.vue`** — ÚNICO archivo afectado. Se añade ~5 líneas de template en la Pestaña 4, entre el `<h3>` (línea 854) y el mensaje `chip-empty` (línea 855). Sin cambios en `<script>`, sin nuevos imports, sin cambios en backend.

### Dependencias Verificadas

| Dependencia | Ubicación | Estado |
|---|---|---|
| `ciaAverage` (computed) | Líneas 116-123 | ✅ Ya definida, usada en Tab 3, disponible en scope de Tab 4 |
| `getCiaLevel(avg)` (function) | Líneas 460-464 | ✅ Definida (`Alto` ≥2.5, `Medio` ≥1.5, `Bajo` <1.5), usada en Tab 3 |
| `getValorImpacto(id)` (function) | Líneas 366+ | ✅ Usada internamente por `ciaAverage`, no necesita invocación directa |

### Approaches

1. **Replicar el bloque exacto de Tab 3** — Copiar el `<div class="form-group">` de las líneas 783-786 tal cual entre el `<h3>` de Tab 4 y el mensaje de estado vacío.
   - Pros: Consistencia visual y de comportamiento con Tab 3. Cero riesgo — el mismo código ya funciona. El campo se muestra incluso cuando no hay filas (`riskRows.length === 0`), igual que en Tab 3.
   - Cons: Ninguno significativo.
   - Effort: **Trivial** (~5 líneas de template copiadas)

2. **Incluir el campo DENTRO del mensaje de estado vacío** — Mostrar el impacto CIA como parte del mensaje `chip-empty`.
   - Pros: Menos espacio vertical cuando no hay filas.
   - Cons: Inconsistente con Tab 3 (donde se muestra como `form-group` separado). Cuando hay filas, el campo desaparecería o habría que duplicarlo. Más lógica condicional innecesaria.
   - Effort: Bajo pero con edge cases

3. **Columna dedicada en la tabla** — Agregar una columna "Impacto CIA" en el `<thead>` y repetir el valor en cada fila.
   - Pros: Visible por fila.
   - Cons: Redundante — el impacto CIA es global (de la Pestaña 1), no por fila. Infla la tabla innecesariamente. Rompe la consistencia con Tab 3.
   - Effort: Medio (requiere modificar estructura de tabla)

### Recommendation

**Approach 1 — Replicar el bloque exacto de Tab 3.** Es la opción más limpia, consistente con el diseño existente, y requiere exactamente el mismo código que ya funciona en Tab 3. La inserción es entre la línea 854 (`<h3>`) y la línea 855 (div `chip-empty`):

```html
<h3 class="val-card-title">Tratamiento de Riesgo — por Fila</h3>
<!-- INSERTAR AQUÍ -->
<div class="form-group">
  <label>Impacto (Extraído de Valoración CIA - Pestaña 1)</label>
  <input type="text" :value="ciaAverage > 0 ? ciaAverage.toFixed(2) + ' — ' + getCiaLevel(ciaAverage) : 'Complete Valoración CIA en Pestaña 1'" readonly style="background:rgba(15,23,42,0.3); cursor:not-allowed;" />
</div>
<!-- FIN INSERT -->
<div v-if="riskRows.length === 0" class="chip-empty">...</div>
```

### Risks

- **Ninguno.** El cambio es puramente aditivo (solo se añade HTML, no se modifica lógica existente). `ciaAverage` y `getCiaLevel` ya están definidas y probadas en el mismo componente. No hay riesgo de regresión en Tab 3 ni en ninguna otra parte del sistema.

### Ready for Proposal

**Sí.** El scope es mínimo (frontend-only, ~5 líneas, un solo archivo, sin dependencias nuevas). Se puede pasar directamente a `sdd-propose`.
