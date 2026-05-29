# Delta for valoracion-modal

## MODIFIED Requirements

### Requirement: Tab 4 — Tratamiento de Riesgo Display

The system MUST display one row per `RiskRow` in Tab 4 (Tratamiento de Riesgo), not one row per `DetalleRiesgo` entry. Each row MUST show all amenaza chips and all vulnerabilidad chips belonging to that row, and MUST bind treatment inputs (`metodoTratamiento`, `tipoControlId`, `riesgoControlId`) to the first matched `DetalleRiesgo` entry via `findMatchedDetalle(row)`.
(Previously: Tab 4 iterated `detallesAmenazas` and `detallesVulnerabilidades` separately, rendering one row per DetalleRiesgo entry)

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
(Previously: no propagation — each DetalleRiesgo entry stored independent treatment values)

#### Scenario: Propagation on save

- GIVEN a `RiskRow` with `amenazaIds=[A1,A2]` and `vulnerabilidadIds=[V1]` where the user has filled treatment fields
- WHEN `submitValoracion()` is called
- THEN all entries in `detallesRiesgo` with `amenazaIds=[A1,A2]` and `vulnerabilidadIds=[V1]` receive the same treatment field values

#### Scenario: No propagation for unmatched entries

- GIVEN two `RiskRow` entries where row1 has `amenazaIds=[A1]` and row2 has `amenazaIds=[A2]`
- WHEN `submitValoracion()` is called
- THEN entries belonging to row1 are NOT modified by row2's treatment values and vice versa