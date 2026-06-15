# Exploration: Reporte de Evaluación de Riesgo — Valores Incorrectos

## Current State

El reporte de evaluación de riesgo (`GET /reportes/evaluacion-riesgo`) lee los valores `evaluacionRiesgo` y `nivelRiesgo` directamente de la tabla `DetalleRiesgo` SIN recalcular — tal como lo especifica la spec base (`openspec/specs/reporte-evaluacion-riesgo/spec.md` sección "Risk Values Are Read from Persisted Columns"). El problema está en CÓMO se calculan y persisten esos valores durante la creación/edición de valoraciones.

### Fórmula de cálculo de riesgo (matriz EGSI v1.4)

```
evaluacionRiesgo = VA × nivelAmenaza × nivelVulnerabilidad
```

Donde:
- **VA** = promedio de impacto CIA (valores 1-3 del catálogo Impacto para Confidencialidad, Integridad, Disponibilidad)
- **nivelAmenaza** = valor numérico (1-3) del catálogo Riesgo para la amenaza seleccionada
- **nivelVulnerabilidad** = valor numérico (1-3) del catálogo Riesgo para la vulnerabilidad seleccionada

### Derivación de niveles (backend)

```
evaluacionRiesgo ≤ 3  → BAJO
evaluacionRiesgo ≤ 8  → MEDIO
evaluacionRiesgo ≤ 27 → ALTO
```

## Root Causes Identificadas

### BUG #1 (CRÍTICO): VA siempre es 3 — `mapDetalleRiesgo()` en `backend/src/valoraciones/valoraciones.service.ts`

**Archivo**: `backend/src/valoraciones/valoraciones.service.ts`, línea 281-284

```typescript
const nivelAmenaza = nivelAmenazaValor ?? 1;
const nivelVulnerabilidad = nivelVulnerabilidadValor ?? 1;
const riesgo = calculateRiesgo(
  3,  // ← BUG: hardcoded VA=3 en vez de usar el promedio CIA real
  nivelAmenaza,
  nivelVulnerabilidad,
  nivelAmenazaControlValor,
  nivelVulnerabilidadControlValor,
);
```

**Consecuencia**: TODOS los `evaluacionRiesgo` se calculan asumiendo impacto CIA máximo (3). Para activos con CIA real = 1, los valores están inflados 3×; con CIA real = 2, inflados 1.5×.

**Por qué existe este bug**: El método `mapDetalleRiesgo()` es una función privada que NO tiene acceso al contexto del `ValoracionActivo` padre. No sabe cuáles son los `confidencialidadId`, `integridadId`, `disponibilidadId` del activo. Necesita recibir esos IDs o el VA ya calculado como parámetro adicional.

### BUG #2: `calcularDetalleRiesgo()` también usa VA=3 por defecto

**Archivo**: `backend/src/valoraciones/valoraciones.service.ts`, línea 201-202

```typescript
const va = dto.VA ?? 3;
```

Cuando el frontend llama al endpoint `PATCH /valoraciones/:id/detalles-riesgo/:detalleId/calcular`, NO envía el parámetro `VA` (solo envía `nivelAmenaza`, `nivelVulnerabilidad`, etc.). El backend hace fallback a 3. Esto duplica el bug — incluso el endpoint de preview/pre-cálculo usa un valor incorrecto.

**Archivo frontend**: `frontend/pages/valoracion.vue`, línea 350-374 — el frontend calcula `nivelAmenaza` y `nivelVulnerabilidad` desde `valRiesgos` pero NUNCA envía `VA` en el body.

### BUG #3: Inconsistencia frontend `calcularNivelRiesgo` (4 niveles con "Crítico") vs backend `deriveNivelRiesgo` (3 niveles)

**Archivo**: `frontend/components/ValoracionModal.vue`

| Función | Niveles | Umbral | Uso |
|---------|---------|--------|-----|
| `deriveNivelRiesgo` (línea 517) | 3 niveles: BAJO, MEDIO, ALTO | 1-3/4-8/9-27 | Tab 3 preview (`localCalculateRiesgo`) |
| `calcularNivelRiesgo` (línea 477) | 4 niveles: Crítico, Alto, Medio, Bajo | ≥18=Crítico, ≥9=Alto, ≥3=Medio | Tab 4 control (`updateControlDetalleRow`) |

El backend (`calculo-riesgo.service.ts`, `deriveNivelRiesgo`) usa 3 niveles: BAJO (≤3), MEDIO (≤8), ALTO (≤27). La función `calcularNivelRiesgo` con 4 niveles NO coincide con el backend:
- Valores 18-27: frontend muestra "Crítico", backend guarda "ALTO"
- Umbrales numéricos diferentes (back-end: ≤3/≤8/≤27 vs front-end: ≥3=Medio, ≥9=Alto, ≥18=Crítico)

Esto causa que la preview en Tab 4 muestre un nivel diferente al que se persistirá.

### BUG #4 (MENOR): `ValoracionActivo.evaluacionRiesgo` / `nivelRiesgo` nunca se persisten

**Archivo**: `backend/src/reportes/reportes.service.ts`, líneas 105-106 (`riesgos-por-activo`)

```typescript
evaluacionRiesgo: va.evaluacionRiesgo,
nivelRiesgo: va.nivelRiesgo,
```

El modelo `ValoracionActivo` (Prisma schema, líneas 122-123) tiene campos `evaluacionRiesgo Float?` y `nivelRiesgo String?`, pero el servicio `valoraciones.service.ts` nunca los escribe en `create()` o `update()`. Los valores solo se persisten en `DetalleRiesgo`.

El reporte `riesgos-por-activo` lee de `ValoracionActivo` directamente, por lo que SIEMPRE retorna `null` para estos campos.

## Affected Areas

| Archivo | Por qué |
|--------|---------|
| `backend/src/valoraciones/valoraciones.service.ts` | `mapDetalleRiesgo()` (línea 281) hardcodea VA=3. Debe recibir el promedio CIA del activo. También `calcularDetalleRiesgo()` (línea 201) hace fallback a VA=3. |
| `backend/src/valoraciones/calculo-riesgo.service.ts` | `calculateRiesgo()` y `deriveNivelRiesgo()` — la función es correcta, el bug está en quién la invoca con VA equivocado. |
| `frontend/pages/valoracion.vue` | `submitValoracion()` (línea 350-374) llama al endpoint `/calcular` sin enviar `VA`. |
| `frontend/components/ValoracionModal.vue` | `calcularNivelRiesgo()` (línea 477) usa 4 niveles inconsistentes con el backend. `updateControlDetalleRow()` lo usa para preview de Tab 4. |
| `backend/src/reportes/reportes.service.ts` | `riesgos-por-activo` (línea 105-106) lee `va.evaluacionRiesgo` que nunca se persiste → siempre null. |
| `frontend/pages/reportes/evaluacion-riesgo.vue` | Página de reporte — no tiene bug propio, pero muestra los valores incorrectos persistidos. |

## Approaches

### 1. **Fix `mapDetalleRiesgo()` para usar CIA real + limpiar inconsistencias frontend** (RECOMENDADO)

Modificar `mapDetalleRiesgo()` para que reciba el promedio CIA del activo padre como parámetro y lo use en `calculateRiesgo()`. También normalizar `calcularNivelRiesgo()` en el frontend para que coincida con el backend (3 niveles, no 4 con "Crítico"). Para `calcularDetalleRiesgo()`, permitir pasar VA o calcularlo desde el ValoracionActivo padre.

- **Pros**: Soluciona la raíz del problema. Datos nuevos serán correctos.
- **Cons**: Datos existentes seguirán siendo incorrectos hasta que se reediten. Se podría agregar un endpoint de migración/recalculo.
- **Effort**: Medium

### 2. **Recalcular en el reporte en vez de leer valores persistidos**

Cambiar `getEvaluacionRiesgo()` para recalcular `evaluacionRiesgo` usando el CIA real del activo en vez de leer `dr.evaluacionRiesgo`.

- **Pros**: "Corrige" los valores en el reporte sin tocar la lógica de persistencia.
- **Cons**: Viola la spec existente ("Risk Values Are Read from Persisted Columns"). Los valores en el reporte no coincidirían con los de la DB (confuso). Problema de inconsistencia entre lo mostrado y lo almacenado.
- **Effort**: Low

### 3. **Recalcular en el frontend en vez de mostrar valores del backend**

El frontend podría recibir los datos crudos (CIA IDs, riesgo IDs) y recalcular localmente.

- **Pros**: No requiere cambios en backend.
- **Cons**: Duplica lógica de negocio. Nueva fuente de inconsistencia. El frontend no tiene el catálogo Impacto completo en contexto.
- **Effort**: Medium

## Recommendation

**Approach 1** es el correcto. La raíz del problema está en `mapDetalleRiesgo()` que hardcodea `VA=3` en vez de usar el promedio CIA real del activo. Cualquier otra solución sería un parche superficial.

### Plan de implementación sugerido:

1. **Modificar `mapDetalleRiesgo()`** para aceptar un parámetro `va` (promedio CIA) y pasarlo a `calculateRiesgo()`.
2. En **`create()`**, calcular el VA desde los `confidencialidadId`, `integridadId`, `disponibilidadId` del DTO (buscando sus `valor` en el catálogo Impacto).
3. En **`update()`**, leer los CIA IDs del `ValoracionActivo` existente y calcular el VA.
4. **Normalizar `calcularNivelRiesgo()`** en el frontend para usar 3 niveles (eliminar "Crítico") y umbrales idénticos al backend.
5. **Agregar `VA` al body** en `submitValoracion()` cuando llama al endpoint `/calcular`.
6. Opcional: crear un endpoint `POST /valoraciones/recalcular` que recalcule todos los `DetalleRiesgo` existentes con el VA correcto.

## Risks

- **Datos existentes corruptos**: Todos los registros creados antes del fix tendrán `evaluacionRiesgo` inflado. Se necesita un plan de migración/recalculo.
- **Cambio de comportamiento en UI**: Si se elimina "Crítico" del frontend, usuarios que veían ese nivel lo perderán. Debe comunicarse.
- **Regresión en `riesgos-por-activo`**: Si se empieza a persistir `ValoracionActivo.evaluacionRiesgo`, el reporte `riesgos-por-activo` pasará de mostrar null a mostrar valores (posiblemente también incorrectos si no se recalcula).
- **El `ValoracionActivo.impacto` (Float?) ya existe en el schema** y el frontend lo envía (`impacto: ciaAverage.value` en línea 397 de valoracion.vue). Pero el backend NUNCA lo usa en `mapDetalleRiesgo()`. Se podría usar directamente este campo en vez de recalcular.

## Ready for Proposal

**Yes** — el problema está claramente identificado y acotado. Proceder a `sdd-propose`.
