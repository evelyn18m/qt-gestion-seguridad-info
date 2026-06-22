# Exploration: Valores Incorrectos en Columna "Evaluación de Riesgo" — Modal y Reportes

## Resumen Ejecutivo

El modal de valoración (Tab 3) muestra una **preview CORRECTA** de `evaluacionRiesgo` usando el promedio CIA real del activo. PERO cuando el usuario guarda, el backend recalcula todo con **VA=3 hardcodeado**, ignorando tanto la preview correcta como los valores enviados desde el frontend. El reporte lee los valores persistidos (con VA=3), mostrando números que NO coinciden con lo que el usuario vio en el modal.

**Raíz**: `mapDetalleRiesgo()` en `backend/src/valoraciones/valoraciones.service.ts:326` hardcodea `VA=3` en vez de calcular el promedio CIA del `ValoracionActivo` padre. El endpoint `/calcular` (línea 230) también usa `dto.VA ?? 3` y el frontend NUNCA envía `VA` (línea 364 de `valoracion.vue`).

---

## 1. Current State — Flujo de Datos Completo

### Fórmula (matriz EGSI v1.4)
```
evaluacionRiesgo = VA × nivelAmenaza × nivelVulnerabilidad
```
Donde:
- **VA** = promedio de impacto CIA (1–3)
- **nivelAmenaza** = valor (1–3) del catálogo Riesgo para la amenaza
- **nivelVulnerabilidad** = valor (1–3) del catálogo Riesgo para la vulnerabilidad

### Derivación de niveles (backend)
```
evaluacionRiesgo ≤ 3  → BAJO
evaluacionRiesgo ≤ 9  → MEDIO   (default: riesgoMedioMax)
evaluacionRiesgo ≤ 27 → ALTO    (configurable via ConfiguracionRiesgo)
```

### Etapa 1: Preview en Modal (CORRECTA ✅)
**Archivo**: `frontend/components/ValoracionModal.vue`

1. Tab 1: Usuario selecciona Confidencialidad/Integridad/Disponibilidad → `ciaAverage` computed (líneas 117-124) calcula el promedio real desde `valImpactos` del catálogo. **CORRECTO**.

2. Tab 3: Usuario selecciona `riesgoId` y `vulnerabilidadRiesgoId` para cada fila → `updateEvaluacionDetalle()` (líneas 595-603):
   - Obtiene VA real: `ciaAverage.value` (línea 534)
   - Obtiene nivelAmenaza: `getValorRiesgo(d.riesgoId)` del catálogo valRiesgos (línea 535)
   - Obtiene nivelVulnerabilidad: `getValorRiesgo(d.vulnerabilidadRiesgoId)` (línea 536)
   - Calcula: `localCalculateRiesgo(va, nivelA, nivelV)` → `va * nivelA * nivelV` (línea 528)
   - Deriva nivel con `deriveNivelRiesgo()` (línea 517-520): ≤3=BAJO, ≤8=MEDIO, ≤27=ALTO → **CORRECTO**

3. Tab 3 columna "Evaluación" (template línea 1017-1022): muestra `getRowPreview(...).evaluacionRiesgo.toFixed(2)` → preview con CIA real.

**Conclusión**: La preview en el modal es CORRECTA. El usuario ve el valor real (ej: VA=1.67 × Amenaza=2 × Vuln=3 = 10.02).

### Etapa 2: Submit → Backend (INCORRECTA ❌)
**Archivo**: `frontend/pages/valoracion.vue`

1. `submitValoracion()` construye `detallesPayload` (líneas 271-293) con `evaluacionRiesgo` y `nivelRiesgo` (los valores correctos de la preview).

2. **Phase 3** (líneas 324-376): El frontend llama a `PATCH /valoraciones/:id/detalles-riesgo/:detalleId/calcular` para cada detalle que tiene `riesgoId`:
   ```typescript
   // línea 364 — BUG: NO envía VA
   body: JSON.stringify({ nivelAmenaza, nivelVulnerabilidad, nivelAmenazaControl, nivelVulnerabilidadControl })
   ```
   **NO incluye `VA` en el body**.

3. El backend en `calcularDetalleRiesgo()` (valoraciones.service.ts:230):
   ```typescript
   const va = dto.VA ?? 3;  // ← BUG: fallback a 3 porque VA no llega
   ```
   Calcula con VA=3 y retorna valores INFLADOS (3× más que CIA=1, 1.5× más que CIA=2).

4. El frontend SOBRESCRIBE los valores correctos de la preview (líneas 367-374):
   ```typescript
   Object.assign(d, {
     evaluacionRiesgo: calculado.evaluacionRiesgo,  // ← VA=3, valor inflado
     nivelRiesgo: calculado.nivelRiesgo,
     // ...
   })
   ```

5. El body final se envía al backend `POST/PATCH /valoraciones`.

### Etapa 3: Persistencia Backend (INCORRECTA ❌)
**Archivo**: `backend/src/valoraciones/valoraciones.service.ts`

`mapDetalleRiesgo()` (línea 262-342):
1. **Líneas 280-282**: Spread de `d.evaluacionRiesgo` y `d.nivelRiesgo` desde el DTO → pero esto es **DEAD CODE** porque...
2. **Líneas 325-326**: RECALCULA con VA=3 hardcodeado:
   ```typescript
   const riesgo = calculateRiesgo(
     3,  // ← BUG CRÍTICO: hardcoded VA=3 en vez de usar CIA real del activo
     nivelAmenaza,
     nivelVulnerabilidad,
     nivelAmenazaControlValor,
     nivelVulnerabilidadControlValor,
     config,
   );
   ```
3. **Líneas 333-334**: SOBRESCRIBE lo que sea que haya llegado del frontend:
   ```typescript
   data.evaluacionRiesgo = riesgo.evaluacionRiesgo;  // ← siempre VA=3
   data.nivelRiesgo = riesgo.nivelRiesgo;
   ```

**Consecuencia**: INCLUSO SI el frontend enviara los valores correctos, el backend los ignora y recalcula con VA=3.

### Etapa 4: Reporte (MUESTRA VALORES INCORRECTOS ❌)
**Archivo**: `backend/src/reportes/reportes.service.ts`

- `getEvaluacionRiesgo()` (línea 683): Lee `dr.evaluacionRiesgo` de la DB → valor persistido con VA=3.
- `getRiesgosPorActivo()` (líneas 119-120): Lee `va.evaluacionRiesgo` y `va.nivelRiesgo` del `ValoracionActivo` → **SIEMPRE null** porque nunca se persisten (ver Bug #4).

**Archivo**: `frontend/pages/reportes/evaluacion-riesgo.vue`

- Template línea 314: `{{ r.evaluacionRiesgo != null ? r.evaluacionRiesgo.toFixed(2) : '—' }}` → muestra valor persistido (VA=3).
- Template línea 313: `{{ r.impacto != null ? r.impacto.toFixed(2) : '—' }}` → muestra `va.impacto` (SÍ se persiste, es correcto).

**Resultado visible**: En el reporte, la columna "Impacto" muestra el CIA real (ej: 1.67) pero la columna "Evaluación Riesgo" muestra un valor calculado con VA=3 (ej: 18 en vez de 10.02). Esto es **visiblemente inconsistente** para el usuario.

---

## 2. Root Cause Analysis

### Bug #1 (CRÍTICO): `mapDetalleRiesgo()` hardcodea VA=3
- **Archivo**: `backend/src/valoraciones/valoraciones.service.ts`
- **Línea**: 326
- **Causa**: `mapDetalleRiesgo()` es un método privado que no recibe el `ValoracionActivo` padre. Solo recibe los IDs de riesgo (amenaza/vulnerabilidad) resueltos a sus `valor` numérico, pero NO recibe los `confidencialidadId`, `integridadId`, `disponibilidadId` para calcular el promedio CIA.
- **Efecto**: Para CIA real = 1 → valores 3× inflados. Para CIA real = 2 → 1.5× inflados. Solo es correcto cuando CIA real = 3.

### Bug #2 (HIGH): `calcularDetalleRiesgo()` fallback VA=3 + frontend no envía VA
- **Backend**: `valoraciones.service.ts:230` — `const va = dto.VA ?? 3`
- **Frontend**: `valoracion.vue:364` — no incluye `VA` en el body del request
- **Efecto**: La preview del endpoint `/calcular` también retorna valores incorrectos, y el frontend los usa para SOBRESCRIBIR su preview correcta.

### Bug #3 (LOW): `calcularNivelRiesgo()` en frontend usa 4 niveles con "Crítico"
- **Archivo**: `frontend/components/ValoracionModal.vue:477-482`
- **Niveles frontend**: Crítico (≥18), Alto (≥9), Medio (≥3), Bajo (<3)
- **Niveles backend**: ALTO (≤27), MEDIO (≤9), BAJO (≤3) — 3 niveles, umbrales ≤ no ≥
- **Impacto**: Solo afecta Tab 4 preview (`updateControlDetalleRow`). La preview muestra "Crítico" para valores 18-27, pero el backend persistirá "ALTO". La inconsistencia es solo visual/preview, no afecta la persistencia directa (porque el backend recalculca igual).

### Bug #4 (MEDIUM): `ValoracionActivo.evaluacionRiesgo` / `nivelRiesgo` nunca se persisten
- **Archivo**: `backend/src/valoraciones/valoraciones.service.ts`
- Líneas 40-120 (`create`) y 122-209 (`update`): Crean/actualizan `ValoracionActivo` sin calcular ni persistir `evaluacionRiesgo` o `nivelRiesgo`.
- **Efecto**: `getRiesgosPorActivo()` (reportes.service.ts:119-120) siempre retorna `null` para estos campos. El reporte "Riesgos por Activo" nunca muestra evaluación de riesgo.

### Bug #5 (NUEVO): Spread de `evaluacionRiesgo`/`nivelRiesgo` en `mapDetalleRiesgo` es dead code
- **Archivo**: `backend/src/valoraciones/valoraciones.service.ts:280-283`
- Las líneas 280-283 hacen spread condicional de `d.evaluacionRiesgo` y `d.nivelRiesgo`, pero las líneas 333-334 siempre los SOBRESCRIBEN con el valor recalculado.
- El DTO `CreateValoracionDto` incluye `evaluacionRiesgo` y `nivelRiesgo` (líneas 213-217 del DTO) y `DetalleRiesgoDto` también (líneas 73-78), pero estos campos NUNCA se usan para el resultado final.

### Bug #6 (NUEVO): Inconsistencia de niveles en helpers del frontend
- `getNivelStyle()` (ValoracionModal.vue:484-489, valoracion.vue:574-579, ValoracionViewModal.vue:46-51) soporta "Crítico".
- `getMaxNivelIndex()` + `getNivelFromIndex()` (valoracion.vue:582-595, ValoracionViewModal.vue:54-67) usan 4 niveles (Crítico=4).
- `resumenEvaluacionRiesgo()` y `resumenControl()` en ambas páginas usan estos helpers → muestran "Crítico" en el listado principal cuando el backend solo persiste 3 niveles.

---

## 3. Affected Areas

| Archivo | Línea(s) | Qué está mal |
|---------|----------|-------------|
| `backend/src/valoraciones/valoraciones.service.ts` | 326 | `3` hardcodeado como VA en `calculateRiesgo()` |
| `backend/src/valoraciones/valoraciones.service.ts` | 230 | `dto.VA ?? 3` — fallback incorrecto |
| `backend/src/valoraciones/valoraciones.service.ts` | 280-283, 333-334 | Spread de `evaluacionRiesgo`/`nivelRiesgo` es dead code; siempre se sobreescribe |
| `backend/src/valoraciones/valoraciones.service.ts` | 40-120, 122-209 | `ValoracionActivo.evaluacionRiesgo`/`nivelRiesgo` nunca se persisten |
| `backend/src/valoraciones/valoraciones.service.ts` | 262 (signature) | `mapDetalleRiesgo()` necesita recibir VA como parámetro adicional |
| `frontend/pages/valoracion.vue` | 364 | Body del `/calcular` no incluye `VA` |
| `frontend/pages/valoracion.vue` | 367-374 | Sobrescribe preview correcta con respuesta del backend (VA=3) |
| `frontend/pages/valoracion.vue` | 597-608 | `resumenEvaluacionRiesgo()` usa 4 niveles (Crítico) y lee `va.evaluacionRiesgo` que es null |
| `frontend/components/ValoracionModal.vue` | 477-482 | `calcularNivelRiesgo()` usa 4 niveles con "Crítico" |
| `frontend/components/ValoracionModal.vue` | 610-616 | `updateControlDetalleRow()` usa `calcularNivelRiesgo` (4 niveles) para preview |
| `frontend/components/ValoracionViewModal.vue` | 46-67, 85-115 | `getNivelStyle`/`getMaxNivelIndex`/`getNivelFromIndex` usan 4 niveles |
| `backend/src/reportes/reportes.service.ts` | 119-120 | `va.evaluacionRiesgo`/`va.nivelRiesgo` siempre null |
| `backend/src/valoraciones/valoraciones.service.spec.ts` | 474-479 | Tests validan el comportamiento BUGGY (VA=3), deben actualizarse |
| `backend/prisma/schema.prisma` | 122-123 | `evaluacionRiesgo Float?` y `nivelRiesgo String?` existen pero nunca se escriben |

---

## 4. Approaches

### Approach 1 (RECOMENDADO): Pasar VA real a `mapDetalleRiesgo()` + enviar VA desde frontend

**Cambios backend**:
1. Modificar `mapDetalleRiesgo()` para aceptar un parámetro `va: number` y usarlo en `calculateRiesgo()` en vez del `3` hardcodeado.
2. En `create()`: calcular VA desde los `confidencialidadId`, `integridadId`, `disponibilidadId` del DTO (buscando `valor` en catálogo Impacto) y pasarlo a `mapDetalleRiesgo()`.
3. En `update()`: leer los CIA IDs del `ValoracionActivo` existente y calcular VA.
4. Persistir `ValoracionActivo.evaluacionRiesgo` y `nivelRiesgo` (promedio o máximo de los detalles).
5. En `calcularDetalleRiesgo()`: en vez de `dto.VA ?? 3`, buscar el VA real del `ValoracionActivo` padre si `dto.VA` no fue provisto.

**Cambios frontend**:
6. En `submitValoracion()`: enviar `VA: ciaAverage.value` en el body del `/calcular`.
7. Normalizar `calcularNivelRiesgo()` a 3 niveles (eliminar "Crítico") para que coincida con backend.
8. Normalizar `getNivelStyle`/`getMaxNivelIndex`/`getNivelFromIndex`/`resumenEvaluacionRiesgo`/`resumenControl` a 3 niveles.

- **Pros**: Soluciona la raíz. Datos nuevos serán correctos. Elimina inconsistencia frontend/backend.
- **Cons**: Datos existentes seguirán con VA=3 (necesitan migración/recalculo). Requiere cambios en ambos lados.
- **Effort**: Medium

### Approach 2: Usar `ValoracionActivo.impacto` que ya se persiste

El campo `ValoracionActivo.impacto` (schema línea 117) YA es enviado por el frontend (`impacto: ciaAverage.value || null`, valoracion.vue:397) y YA es persistido por el backend (está en `data` del DTO). Se podría usar este campo en `mapDetalleRiesgo()` en vez de recalcular el CIA.

- **Pros**: Menos cambios. El dato ya existe y es correcto.
- **Cons**: `impacto` está en `ValoracionActivo` pero `mapDetalleRiesgo()` no tiene acceso a él (es un método privado que solo recibe el DTO y niveles resueltos). Habría que pasarlo como parámetro. No soluciona el problema de datos existentes.
- **Effort**: Low-Medium

### Approach 3: No recalcular en backend, confiar en el frontend

Eliminar la recalculación en `mapDetalleRiesgo()` (líneas 320-339) y usar los valores que envía el frontend (`d.evaluacionRiesgo`, `d.nivelRiesgo`, etc.).

- **Pros**: Mínimo cambio en backend. El frontend ya calcula correctamente (con CIA real).
- **Cons**: Viola principio de "backend como source of truth". Si el frontend tiene un bug, se persisten datos incorrectos sin validación. No soluciona Phase 3 (`/calcular`) que ya sobreescribe los valores correctos.
- **Effort**: Low

---

## 5. Recommendation

**Approach 1** (pasar VA real a `mapDetalleRiesgo()` + fix frontend). Es el único que ataca la raíz del problema. Las correcciones son:

### Plan de implementación:
1. **`mapDetalleRiesgo()`**: Agregar parámetro `va: number` y reemplazar `3` por `va` (línea 326).
2. **`create()`**: Calcular VA desde `confidencialidadId`/`integridad`/`disponibilidadId` del DTO buscando `valor` en catálogo Impacto. Pasar VA a `mapDetalleRiesgo()`. Persistir `evaluacionRiesgo` y `nivelRiesgo` en `ValoracionActivo`.
3. **`update()`**: Leer CIA IDs del `ValoracionActivo` existente, calcular VA, pasarlo a `mapDetalleRiesgo()`. Persistir `evaluacionRiesgo` y `nivelRiesgo`.
4. **`calcularDetalleRiesgo()`**: Si `dto.VA` no fue provisto, obtener el VA real del `ValoracionActivo` padre.
5. **Frontend `submitValoracion()`**: Enviar `VA: ciaAverage.value` en el body del `/calcular`.
6. **Frontend `ValoracionModal.vue`**: Normalizar `calcularNivelRiesgo()` (línea 477-482) a 3 niveles: ≤3=BAJO, ≤8=MEDIO, ≤27=ALTO.
7. **Frontend helpers**: Normalizar `getMaxNivelIndex`/`getNivelFromIndex`/`getNivelStyle` a 3 niveles (eliminar "Crítico").
8. **Tests**: Actualizar `valoraciones.service.spec.ts` para reflejar VA real en vez de VA=3.

---

## 6. Risks

- **Datos existentes corruptos**: Todos los registros creados antes del fix tienen `evaluacionRiesgo` inflado (calculado con VA=3). Se necesita un endpoint de migración (`POST /valoraciones/recalcular`) o un script para recalcular.
- **Regresión en reportes**: Después del fix, `getRiesgosPorActivo()` mostrará valores (antes siempre null). Si los datos viejos no se migran, mezclará nulls con valores correctos.
- **Cambio de comportamiento UI**: Eliminar "Crítico" del frontend cambia lo que los usuarios ven en el listado principal y en Tab 4. Debe comunicarse.
- **Rendimiento en `create()`**: Calcular VA requiere 3 queries adicionales al catálogo Impacto (o 1 query con `findMany` + filtro en memoria). Impacto mínimo.
- **El DTO `CreateValoracionDto` ya tiene `evaluacionRiesgo` y `nivelRiesgo`** (líneas 213-217) pero el servicio los ignora. Si se empiezan a usar, validar que el frontend los envíe correctamente.

---

## 7. Ready for Proposal

**Yes** — el problema está completamente identificado y acotado. Los 6 bugs están documentados con líneas exactas. Proceder a `sdd-propose`.
