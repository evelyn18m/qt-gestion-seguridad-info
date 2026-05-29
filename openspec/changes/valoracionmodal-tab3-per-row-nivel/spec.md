# Delta: valoracionmodal-tab3-per-row-nivel

## Purpose

Fix Tab 3 (Evaluación de Riesgo) in `ValoracionModal` so each risk item row computes its own preview — replacing the broken global selects with per-row dual selects and `localCalculateRiesgo`.

## ADDED Requirements

### Requirement: Per-Row Dual Selects in Tab 3

The Tab 3 table MUST render two selects per row: `d.riesgoId` (amenaza nivel) and `d.vulnerabilidadRiesgoId` (vulnerabilidad nivel). Each row's selects are independent of all other rows.

#### Scenario: Render two selects per row

- GIVEN Tab 3 is visible with `detallesRiesgo` containing 3 entries
- WHEN the table renders
- THEN each row shows `select[d.riesgoId]` AND `select[d.vulnerabilidadRiesgoId]` side by side
- AND neither select shares state with any other row

#### Scenario: Both selects default to current value or empty

- GIVEN a DetalleRiesgo row has `riesgoId = 2` and `vulnerabilidadRiesgoId = null`
- WHEN the row renders
- THEN `select[d.riesgoId]` shows option `2` selected
- AND `select[d.vulnerabilidadRiesgoId]` shows placeholder "Seleccione..." (no selection)

### Requirement: Per-Row Preview Calculation

Each row MUST compute and display its own `evaluacionRiesgo` and `nivelRiesgo` from `localCalculateRiesgo(ciaAverage, getValorRiesgo(d.riesgoId), getValorRiesgo(d.vulnerabilidadRiesgoId))`. The result is shown inline in the row — no global preview.

#### Scenario: Row preview updates on amenaza select change

- GIVEN a row has `d.riesgoId = null`, `d.vulnerabilidadRiesgoId = 2`, `ciaAverage = 3`
- WHEN user changes `d.riesgoId` to option with `valorRiesgo = 2`
- THEN `localCalculateRiesgo(3, 2, 2)` is called
- AND the row's `evaluacionRiesgo` and `nivelRiesgo` update immediately

#### Scenario: Row preview updates on vulnerabilidad select change

- GIVEN a row has `d.riesgoId = 2`, `d.vulnerabilidadRiesgoId = null`, `ciaAverage = 3`
- WHEN user changes `d.vulnerabilidadRiesgoId` to option with `valorRiesgo = 1`
- THEN `localCalculateRiesgo(3, 2, 1)` is called
- AND the row's `evaluacionRiesgo` and `nivelRiesgo` update immediately

#### Scenario: Both selects null yields empty preview

- GIVEN a row has `d.riesgoId = null` and `d.vulnerabilidadRiesgoId = null`
- WHEN the row renders
- THEN `evaluacionRiesgo` and `nivelRiesgo` display shows `—` (no calculation)

### Requirement: Per-Row Controles de Área Display

Each row MUST display `controlesImplementados` from the corresponding `DetalleRiesgo` entry. The display is read-only; Tab 3 does not edit `controlesImplementados`.

#### Scenario: Read-only controles per row

- GIVEN a DetalleRiesgo row has `controlesImplementados = "5 controles aplicados"`
- WHEN Tab 3 renders that row
- THEN the `controles de área` column shows that text
- AND the text is not editable within Tab 3

## MODIFIED Requirements

### Requirement: Tab 3 Renders Without Global Selects

(Previously: Tab 3 used global `evaluacionForm.amenazaRiesgoId` and `evaluacionForm.vulnerabilidadRiesgoId` selects at lines 706–720 driving a single shared `previewRiesgo`)

Tab 3 MUST NOT have global `amenazaRiesgoId` or `vulnerabilidadRiesgoId` selects. The global `evaluacionForm` fields `amenazaRiesgoId` and `vulnerabilidadRiesgoId` MUST NOT be rendered as selects in Tab 3. Each row operates independently.

#### Scenario: No global selects in Tab 3

- GIVEN Tab 3 is visible
- WHEN the form renders
- THEN there is no `select[evaluacionForm.amenazaRiesgoId]` in the DOM
- AND there is no `select[evaluacionForm.vulnerabilidadRiesgoId]` in the DOM
- AND no single shared `previewRiesgo` display exists

### Requirement: DetalleRiesgo Schema Includes vulnerabilidadRiesgoId

(Previously: `DetalleRiesgo` model had only `riesgoId Int?` for amenaza nivel)

The `DetalleRiesgo` Prisma model MUST include `vulnerabilidadRiesgoId Int?` column. The TypeScript interface in `frontend/types/api.d.ts` MUST include `vulnerabilidadRiesgoId?: number | null` on the `DetalleRiesgo` type.

#### Scenario: New column exists in schema

- GIVEN `backend/prisma/schema.prisma` is inspected
- WHEN `DetalleRiesgo` model is examined
- THEN `vulnerabilidadRiesgoId Int?` field is present

#### Scenario: TypeScript interface updated

- GIVEN `frontend/types/api.d.ts` is inspected
- WHEN `DetalleRiesgo` interface is examined
- THEN `vulnerabilidadRiesgoId?: number | null` field is declared

## REMOVED Requirements

### Requirement: Global amenazaRiesgoId Select in Tab 3

(Reason: Replaced by per-row `d.riesgoId` select — each row has its own amenaza nivel select.)

The global `evaluacionForm.amenazaRiesgoId` MUST NOT be rendered as a select in Tab 3. This field is ignored by Tab 3's per-row model.

### Requirement: Global vulnerabilidadeRiesgoId Select in Tab 3

(Reason: Replaced by per-row `d.vulnerabilidadRiesgoId` select — each row has its own vulnerabilidad nivel select.)

The global `evaluacionForm.vulnerabilidadRiesgoId` MUST NOT be rendered as a select in Tab 3. This field is ignored by Tab 3's per-row model.

### Requirement: Single Shared previewRiesgo Display

(Reason: Replaced by per-row inline `evaluacionRiesgo`/`nivelRiesgo` display in each row — each row computes its own.)

Tab 3 MUST NOT display a single shared `previewRiesgo` computed from global selects. Each row shows its own computed values.

## Migration Specs

### Requirement: Database Migration for vulnerabilidadRiesgoId

The migration MUST add `vulnerabilidadRiesgoId Int?` column to `DetalleRiesgo` table. The migration MUST be additive (no data loss) and MUST NOT drop any existing columns.

#### Scenario: Run db push after schema change

- GIVEN `backend/prisma/schema.prisma` has been updated with `vulnerabilidadRiesgoId Int?`
- WHEN `npx prisma db push` is executed from the backend container
- THEN the column is created in MySQL without error
- AND existing `riesgoId` data is preserved

#### Scenario: Existing records load with null vulnerabilidadRiesgoId

- GIVEN pre-existing DetalleRiesgo records exist without `vulnerabilidadRiesgoId`
- WHEN `valoracion.vue` loads those records for edit
- THEN `d.vulnerabilidadRiesgoId` is `null` or `undefined`
- AND the row renders with empty vulnerabilidad select
- AND `localCalculateRiesgo` produces `—` for that row until a selection is made