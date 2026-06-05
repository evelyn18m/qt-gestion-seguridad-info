# Delta for valoracion-modal

## ADDED Requirements

### Requirement: DetalleRiesgo Schema Has vulnerabilidadControlId

The Prisma `DetalleRiesgo` model MUST include `vulnerabilidadControlId Int?` field alongside existing `riesgoControlId Int?`.

#### Scenario: Schema includes new column

- GIVEN `backend/prisma/schema.prisma`
- WHEN the `DetalleRiesgo` model is examined
- THEN `vulnerabilidadControlId Int?` is present

### Requirement: DetalleRiesgoDto Accepts vulnerabilidadControlId

`DetalleRiesgoDto` MUST declare `vulnerabilidadControlId` as `@IsOptional() @IsNumber()`.

#### Scenario: DTO validates new field

- GIVEN a request body with `detallesRiesgo[0].vulnerabilidadControlId: 5`
- WHEN class-validator runs
- THEN the field passes validation

### Requirement: mapDetalleRiesgo Maps vulnerabilidadControlId

`mapDetalleRiesgo()` MUST spread `vulnerabilidadControlId` into the Prisma input when defined, and MUST omit it when undefined.

#### Scenario: Service maps defined value

- GIVEN DetalleRiesgoDto with `vulnerabilidadControlId: 4`
- WHEN `mapDetalleRiesgo()` is called
- THEN Prisma input includes `{ vulnerabilidadControlId: 4 }`

#### Scenario: Service omits undefined value

- GIVEN DetalleRiesgoDto without `vulnerabilidadControlId`
- WHEN `mapDetalleRiesgo()` is called
- THEN Prisma input does NOT contain `vulnerabilidadControlId`

### Requirement: Frontend DetalleRiesgo Type Includes vulnerabilidadControlId

The `DetalleRiesgo` interface in `frontend/types/api.d.ts` MUST declare `vulnerabilidadControlId?: number | null`.

#### Scenario: TypeScript interface has new field

- GIVEN `frontend/types/api.d.ts`
- WHEN the interface is examined
- THEN `vulnerabilidadControlId?: number | null` is declared

### Requirement: Tab 4 Dropdowns Bind to Control Fields

Tab 4 amenaza `<select>` MUST bind `v-model` to `d.riesgoControlId` (not `d.riesgoId`). Tab 4 vulnerabilidad `<select>` MUST bind to `d.vulnerabilidadControlId` (not `d.vulnerabilidadRiesgoId`).

#### Scenario: Tab 4 amenaza uses riesgoControlId

- GIVEN user is on Step 4 with a risk row
- WHEN Nivel Amenaza is changed in Tab 4
- THEN `detalle.riesgoControlId` is updated AND Tab 3 `riesgoId` is unchanged

#### Scenario: Tab 4 vulnerabilidad uses vulnerabilidadControlId

- GIVEN user is on Step 4 with a risk row
- WHEN Nivel Vulnerabilidad is changed in Tab 4
- THEN `detalle.vulnerabilidadControlId` is updated AND Tab 3 `vulnerabilidadRiesgoId` is unchanged

### Requirement: Tab 4 Calculation Uses Control Fields

`updateControlDetalleRow()` MUST read `d.riesgoControlId` and `d.vulnerabilidadControlId` (not `d.riesgoId`/`d.vulnerabilidadRiesgoId`) when computing `evaluacionRiesgoControl` and `nivelRiesgoControl`.

#### Scenario: Calculation uses control-specific values

- GIVEN detalle with `riesgoControlId: 3` and `vulnerabilidadControlId: 5`
- WHEN a Tab 4 dropdown changes
- THEN `evaluacionRiesgoControl` and `nivelRiesgoControl` are computed from those control fields

### Requirement: syncRowsToDetalles Preserves Control Fields

`syncRowsToDetalles()` MUST preserve existing `riesgoControlId` and `vulnerabilidadControlId` when rebuilding entries from risk rows. New entries MUST initialize `vulnerabilidadControlId` to `null`.

#### Scenario: Existing control values survive rebuild

- GIVEN a matched DetalleRiesgo with `riesgoControlId: 3` and `vulnerabilidadControlId: 5`
- WHEN `syncRowsToDetalles()` runs after a Tab 2 edit
- THEN the rebuilt entry retains both control field values

#### Scenario: New entry initializes vulnerabilidadControlId to null

- GIVEN a new risk row with no prior control selections
- WHEN `syncRowsToDetalles()` creates entries
- THEN `vulnerabilidadControlId` is `null`

### Requirement: POST/PATCH Payload Includes Control Fields

The `/valoracion` POST/PATCH request body MUST include `vulnerabilidadControlId` per `detallesRiesgo` row when defined.

#### Scenario: Payload transmits control fields

- GIVEN detalle with `vulnerabilidadControlId: 2`
- WHEN parent page sends POST/PATCH to `/valoracion`
- THEN request body includes `detallesRiesgo[n].vulnerabilidadControlId: 2`

### Requirement: Frontend /calcular Uses Tab 4 Fields

When invoking the `/calcular` endpoint for Tab 4 residual risk preview, the frontend MUST pass the row's `riesgoControlId` as `nivelAmenazaControl` and `vulnerabilidadControlId` as `nivelVulnerabilidadControl`.

#### Scenario: /calcular uses control-level inputs

- GIVEN detalle with `riesgoControlId: 3` and `vulnerabilidadControlId: 2`
- WHEN frontend triggers a `/calcular` request
- THEN body includes `{ nivelAmenazaControl: 3, nivelVulnerabilidadControl: 2 }`
