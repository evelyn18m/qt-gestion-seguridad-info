# reporte-heatmap Specification

> **Change**: arch-sync/heatmap-iso27005, fix/heatmap-evaluacion-riesgo
> **Domain**: reporte-heatmap
> **Last updated**: 2026-06-22

## Purpose

Provides `GET /reportes/heatmap` — aggregates `ValoracionActivo` assessments into a 3×3 count matrix (Evaluación de Riesgo × Impacto Final) in ApexCharts heatmap series format. Y-axis uses `evaluacionRiesgo` with hardcoded thresholds (≤3→Bajo, ≤8→Medio, else Alto).

## Requirements

### Requirement: Heatmap Endpoint Contract

The system MUST expose `GET /reportes/heatmap` with no query parameters, returning `HeatmapReporteDto`: an array of 3 series sorted descending by impact.

#### Scenario: Happy path returns populated matrix

- GIVEN ValoracionActivo records with evaluacionRiesgo != null and CIA Impacto rows
- WHEN `GET /reportes/heatmap` is called
- THEN response is a JSON array of 3 items with `name` and `data` fields
- AND series are ordered `3. Alto`, `2. Medio`, `1. Bajo`

#### Scenario: Empty database returns all-zero matrix

- GIVEN no ValoracionActivo records exist OR all have evaluacionRiesgo IS NULL
- WHEN `GET /reportes/heatmap` is called
- THEN response contains 3 series, each with 3 cells where `y: 0`

### Requirement: Impact Aggregation

The system MUST compute `impactoFinal = max(C.valor, I.valor, D.valor)` per asset using `Impacto.valor` from joined CIA catalog rows.

#### Scenario: Max impact selected

- GIVEN an asset has C.valor=2, I.valor=3, D.valor=1
- WHEN the heatmap is computed
- THEN that asset's impactoFinal is 3

### Requirement: Count Aggregation into Matrix Cells

Each qualifying asset MUST increment exactly one cell `[impactoFinal][evaluacionRiesgoLevel]`. The Y-axis level SHALL be derived from `evaluacionRiesgo` using hardcoded thresholds: ≤3 → 1 (Bajo), ≤8 → 2 (Medio), else 3 (Alto).

#### Scenario: Asset counted in correct cell

- GIVEN an asset with impactoFinal=3 and evaluacionRiesgo=6 (Medio level)
- WHEN the heatmap is computed
- THEN cell at series "3. Alto", column "2. Medio" increments by 1

#### Scenario: Edge thresholds map correctly

- GIVEN assets with evaluacionRiesgo values 3, 4, 8, and 9
- WHEN the heatmap is computed
- THEN 3 maps to level 1 (Bajo), 4 and 8 map to level 2 (Medio), 9 maps to level 3 (Alto)

### Requirement: Null evaluacionRiesgo Exclusion

Assets where `evaluacionRiesgo` IS NULL MUST be excluded from the matrix entirely.

#### Scenario: Null evaluacionRiesgo asset skipped

- GIVEN a ValoracionActivo with evaluacionRiesgo = null and valid CIA rows
- WHEN the heatmap is computed
- THEN that asset contributes zero to all cell counts

### Requirement: ApexCharts Response Structure

Each series MUST follow `{ name: "N. Label", data: [{ x: "N. Label", y: count }] }`. Labels use Spanish: `1. Bajo`, `2. Medio`, `3. Alto`. All 3 evaluación de riesgo columns MUST appear in every series even when `y: 0`.

#### Scenario: Response structure matches ApexCharts heatmap spec

- GIVEN the heatmap is generated
- WHEN the response is serialized
- THEN each series has `name` (string) and `data` (array of objects with `x` string and `y` number)
- AND every series contains exactly 3 data points for all evaluación de riesgo levels

### Requirement: Error Handling on DB Failure

The endpoint MUST return HTTP 500 with a meaningful JSON error message if the database query fails.

#### Scenario: Database connection failure

- GIVEN the database connection is unavailable
- WHEN `GET /reportes/heatmap` is called
- THEN response status is 500 with a descriptive error message in the body
