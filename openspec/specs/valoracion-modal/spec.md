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

## Out of Scope

- Persistencia de datos (el padre maneja API calls)
- Navegación fuera del modal
- Tests unitarios (frontend sin test runner)
