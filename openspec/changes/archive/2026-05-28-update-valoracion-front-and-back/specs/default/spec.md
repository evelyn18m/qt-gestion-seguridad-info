# Delta for update-valoracion-front-and-back

## ADDED Requirements

### Requirement: valTipoActivo ref declaration

The `valoracion.vue` page MUST declare `valTipoActivo` as a `ref([])` reactive reference near other `val*` refs. The ref MUST be initialized before the "Tipo de Activo" dropdown change handler executes to prevent runtime crashes.

#### Scenario: Tipo de Activo dropdown triggers handler without crash

- GIVEN the valoracion page is loaded
- WHEN a user selects a value in the "Tipo de Activo" dropdown
- THEN the `valTipoActivo` ref MUST be declared and accessible
- AND the handler MUST NOT throw "undefined is not a function"

#### Scenario: Page load initializes all val refs

- GIVEN the valoracion page is loading
- WHEN the component setup runs
- THEN all `val*` refs (`valTipoActivo`, `valCategoria`, `valProbabilidad`, etc.) MUST be declared with initial values
- AND no ref used in the template shall be undeclared

### Requirement: Tab 4 data submitted in valoracion payload

The `submitValoracion()` function MUST include all fields from `tratamientoForm` in the POST/PATCH request body. The payload MUST contain Tab 4 fields: `metodoTratamiento`, `tipoControl`, `controlesImplementar`, `reducirProbabilidad`, `reducirImpacto`, `quienReduce`, `fechaImplementacion`, `estadoImplementacion`, `seguimiento`, `fechaSeguimiento`, `Responsable`.

#### Scenario: Submit with Tab 4 fields present

- GIVEN a user has filled in all 4 tabs including Tab 4 "Tratamiento de Riesgo"
- WHEN the user clicks "Guardar" to submit the valoracion
- THEN the API request body MUST contain all Tab 4 fields with their current values
- AND the backend MUST persist Tab 4 data to `ValoracionActivo` record

#### Scenario: Tab 4 data not silently dropped

- GIVEN a user has filled only Tab 4 fields (no data in tabs 1-3)
- WHEN the user submits the form
- THEN Tab 4 data MUST be sent to the backend
- AND Tab 4 data MUST NOT be omitted from the JSON payload

### Requirement: View modal populates all 4 tabs

The view modal invoked via `openViewModal()` MUST populate fields from all 4 tabs when displaying an existing `ValoracionActivo` record. Tab 2, Tab 3, and Tab 4 data MUST be rendered in their respective form sections, not only Tab 1 fields.

#### Scenario: View existing record with complete data

- GIVEN a `ValoracionActivo` record exists with data in all 4 tabs
- WHEN a user opens the view modal for that record
- THEN Tab 1 fields (identificacion) MUST be populated
- AND Tab 2 fields (analisis) MUST be populated
- AND Tab 3 fields (evaluacion) MUST be populated
- AND Tab 4 fields (tratamiento) MUST be populated

#### Scenario: View modal shows Tab 4 even if only Tab 1 had data

- GIVEN a `ValoracionActivo` record exists with only Tab 1 data (historical record)
- WHEN a user opens the view modal for that record
- THEN Tab 1 fields MUST be displayed
- AND Tab 4 section MUST still render (empty or with null values)
- AND no tab sections SHALL be silently omitted

### Requirement: DetalleRiesgo update uses transaction (Should)

The backend `ValoracionService` SHOULD wrap `DetalleRiesgo` updates in a Prisma transaction, executing `deleteMany` followed by `createMany` atomically. This prevents orphaned `DetalleRiesgo` records if `createMany` fails after `deleteMany`.

#### Scenario: DetalleRiesgo update atomicity

- GIVEN a `ValoracionActivo` has existing `DetalleRiesgo` records
- WHEN an update request modifies the riesgos
- THEN all `DetalleRiesgo` changes MUST be applied in a single transaction
- AND if any part fails, no changes SHALL be committed
- AND no orphaned `DetalleRiesgo` records SHALL exist after failure