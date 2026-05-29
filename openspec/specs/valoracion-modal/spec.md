# ValoracionModal Component Specification

## Purpose

`ValoracionModal` es el componente de modal de creación/edición de valoraciones de activos. Reemplaza el bloque modal inline que existía en `frontend/pages/valoracion.vue`. El componente recibe todos los datos como props y emite eventos hacia el padre para mantener el estado centralizado en la página.

## Component Interface

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `modelValue` | `boolean` | Yes | Control de visibilidad (v-model) |
| `editId` | `number \| null` | Yes | ID de valoración en edición, null = nueva |
| `catalogData` | `CatalogData` | Yes | Todos los catálogos cargados |
| `valForm` | `ValFormData` | Yes | Datos del formulario de identificación |
| `analisisForm` | `AnalisisFormData` | Yes | Datos del formulario de análisis |
| `evaluacionForm` | `EvaluacionFormData` | Yes | Datos del formulario de evaluación |
| `tratamientoForm` | `TratamientoFormData` | Yes | Datos del formulario de tratamiento |
| `detallesRiesgo` | `DetalleRiesgo[]` | Yes | Array de detalles de riesgo |
| `activeTab` | `number` | Yes | Tab activo (0-3) |
| `valSaved` | `ValoracionActivo[]` | Yes | Lista de valoraciones guardadas |
| `valSaving` | `boolean` | Yes | Flag de guardando |
| `valSuccess` | `string` | Yes | Mensaje de éxito |
| `valLoading` | `boolean` | Yes | Flag de cargando |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `update:modelValue` | `boolean` | Cerrar modal |
| `submit` | `SubmitPayload` | Guardar valoración |
| `edit` | `ValoracionActivo` | Cargar datos de edición |
| `open-new` | none | Abrir modal en modo nueva |
| `reset` | none | Resetear formulario |

### Emitted Data Shapes

```typescript
interface CatalogData {
  tiposActivo: CatalogoItem[]
  formatos: CatalogoItem[]
  macroprocesos: CatalogoItem[]
  subprocesos: CatalogoItem[]
  amenazas: CatalogoItem[]
  vulnerabilidades: CatalogoItem[]
  impactos: CatalogoItem[]
  funcionarios: CatalogoItem[]
  areas: CatalogoItem[]
  riesgos: CatalogoItem[]
  probabilidades: CatalogoItem[]
  tiposControl: CatalogoItem[]
}
```

## Requirements

### Requirement: Modal Visibility Control

El componente DEBE mostrar/ocultar el modal según el valor de `modelValue`. Cuando `modelValue` es `false`, el modal NO se renderiza.

#### Scenario: Abrir modal para nueva valoración

- GIVEN `modelValue = true` AND `editId = null`
- WHEN el componente se renderiza
- THEN muestra el header "Nueva Valoración" y tabs vacíos

#### Scenario: Cerrar modal al guardar

- GIVEN el modal está abierto
- WHEN el usuario completa el formulario y guarda exitosamente
- THEN emite `update:modelValue = false` y el modal se cierra

### Requirement: Tab Navigation

El componente DEBE permitir navegación entre los 4 tabs: Valoración de Activo, Análisis de Riesgos, Evaluación de Riesgo, Tratamiento de Riesgo.

#### Scenario: Cambiar tab

- GIVEN el modal está abierto con `activeTab = 0`
- WHEN el usuario hace click en el tab "Análisis de Riesgos"
- THEN el contenido del tab 1 se muestra y el tab activo se marca visualmente

### Requirement: Form Data Binding

El componente DEBE mantener los formularios sincronizados con los props entrantes. Cuando `valForm` cambiaexternamente (ej: edit), el modal DEBE reflejar los nuevos valores.

#### Scenario: Editar valoración pre-popula campos

- GIVEN `editId` es un ID válido de valoración existente
- WHEN el modal se abre
- THEN `valForm`, `analisisForm`, `evaluacionForm` y `detallesRiesgo` contienen los datos de esa valoración

### Requirement: Submit Flow

Cuando el usuario hace submit, el componente DEBE emitir el evento `submit` con el payload estructurado para que el padre lo envie al API.

#### Scenario: Submit con datos válidos

- GIVEN todos los campos requeridos de Tab 1 están completos
- WHEN el usuario hace click en "Guardar"
- THEN emite `submit` con payload que incluye `valForm`, `analisisForm`, `evaluacionForm`, `tratamientoForm` y `detallesRiesgo`

#### Scenario: Submit con campos requeridos faltantes

- GIVEN algún campo requerido de Tab 1 está vacío
- WHEN el usuario hace click en "Guardar"
- THEN muestra mensaje de error y NO emite `submit`

### Requirement: CIA Average Sync

El componente DEBE calcular y mostrar el promedio CIA basado en los valores de `valForm.confidencialidad`, `valForm.integridad` y `valForm.disponibilidad`.

#### Scenario: Calcular CIA promedio

- GIVEN los 3 campos CIA tienen valores seleccionados
- WHEN se calcula `ciaAverage`
- THEN muestra el promedio con su nivel (Alto/Medio/Bajo)

## Component Structure

```
ValoracionModal.vue
├── val-modal-overlay (backdrop click closes)
├── val-modal-content
│   ├── val-modal-header (título dinámico + botón cerrar)
│   ├── val-tabs (4 tabs)
│   └── val-modal-body
│       ├── Tab 0: Identificación + CIA
│       ├── Tab 1: Análisis de Riesgos  
│       ├── Tab 2: Evaluación de Riesgo
│       └── Tab 3: Tratamiento de Riesgo
```

### Requirement: Tab 4 — Tratamiento de Riesgo Display

The system MUST display one row per `RiskRow` in Tab 4 (Tratamiento de Riesgo), not one row per `DetalleRiesgo` entry. Each row MUST show all amenaza chips and all vulnerabilidad chips belonging to that row, and MUST bind treatment inputs (`metodoTratamiento`, `tipoControlId`, `riesgoControlId`) to the first matched `DetalleRiesgo` entry via `findMatchedDetalle(row)`.

#### Scenario: Row with multiple threats + vulnerabilities

- GIVEN a `RiskRow` with `amenazaIds=[A1,A2]` and `vulnerabilidadIds=[V1]`
- WHEN Tab 4 renders
- THEN ONE row displays chips for A1, A2, and V1, with treatment inputs bound via `findMatchedDetalle()`

#### Scenario: Row with only amenazas

- GIVEN a `RiskRow` with `amenazaIds=[A1]` and empty `vulnerabilidadIds`
- WHEN Tab 4 renders
- THEN ONE row displays A1 chips and treatment inputs bound via `findMatchedDetalle()`

#### Scenario: Row with only vulnerabilidades

- GIVEN a `RiskRow` with empty `amenazaIds` and `vulnerabilidadIds=[V1]`
- WHEN Tab 4 renders
- THEN ONE row displays V1 chips and treatment inputs bound via `findMatchedDetalle()`

#### Scenario: Empty row (no threats or vulnerabilities)

- GIVEN a `RiskRow` where both `amenazaIds` and `vulnerabilidadIds` are empty
- WHEN Tab 4 renders
- THEN NO row is displayed for that `RiskRow`

### Requirement: Tab 4 — Treatment Field Propagation on Save

The system MUST propagate treatment field values (`metodoTratamiento`, `tipoControlId`, `riesgoControlId`, `evaluacionRiesgoControl`, `nivelRiesgoControl`) from the first matched `DetalleRiesgo` entry to ALL other `DetalleRiesgo` entries in `detallesRiesgo` that share the same `amenazaIds[]` and `vulnerabilidadIds[]` arrays when `submitValoracion()` is called.

#### Scenario: Propagation on save

- GIVEN a `RiskRow` with `amenazaIds=[A1,A2]` and `vulnerabilidadIds=[V1]` where the user has filled treatment fields
- WHEN `submitValoracion()` is called
- THEN all entries in `detallesRiesgo` with `amenazaIds=[A1,A2]` and `vulnerabilidadIds=[V1]` receive the same treatment field values

#### Scenario: No propagation for unmatched entries

- GIVEN two `RiskRow` entries where row1 has `amenazaIds=[A1]` and row2 has `amenazaIds=[A2]`
- WHEN `submitValoracion()` is called
- THEN entries belonging to row1 are NOT modified by row2's treatment values and vice versa

## Out of Scope

- Persistencia de datos (el padre maneja API calls)
- Navegación fuera del modal
- Tests unitarios (frontend sin test runner)
