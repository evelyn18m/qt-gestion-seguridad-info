# reporte-heatmap Specification

> **Change**: heatmap-iso27005
> **Domain**: reporte-heatmap (NEW)

## Purpose

Provides `GET /reportes/heatmap` — aggregates `ValoracionActivo` assessments into a 3×3 count matrix (Probabilidad × Impacto Final) in ApexCharts heatmap series format.

## Requirements

### Requirement: Heatmap Endpoint Contract

The system MUST expose `GET /reportes/heatmap` with no query parameters, returning `HeatmapReporteDto`: an array of 3 series sorted descending by impact.

#### Scenario: Happy path returns populated matrix

- GIVEN ValoracionActivo records with probabilidadId and CIA Impacto rows
- WHEN `GET /reportes/heatmap` is called
- THEN response is a JSON array of 3 items with `name` and `data` fields
- AND series are ordered `3. Alto`, `2. Medio`, `1. Bajo`

#### Scenario: Empty database returns all-zero matrix

- GIVEN no ValoracionActivo records exist OR all have probabilidadId IS NULL
- WHEN `GET /reportes/heatmap` is called
- THEN response contains 3 series, each with 3 cells where `y: 0`

### Requirement: Impact Aggregation

The system MUST compute `impactoFinal = max(C.valor, I.valor, D.valor)` per asset using `Impacto.valor` from joined CIA catalog rows.

#### Scenario: Max impact selected

- GIVEN an asset has C.valor=2, I.valor=3, D.valor=1
- WHEN the heatmap is computed
- THEN that asset's impactoFinal is 3

### Requirement: Count Aggregation into Matrix Cells

Each qualifying asset MUST increment exactly one cell `[impactoFinal][probabilidadValor]`. `Probabilidad.valor` maps 1=Bajo, 2=Medio, 3=Alto.

#### Scenario: Asset counted in correct cell

- GIVEN an asset with impactoFinal=3 and Probabilidad.valor=2
- WHEN the heatmap is computed
- THEN cell at series "3. Alto", column "2. Medio" increments by 1

### Requirement: Null probabilidadId Exclusion

Assets where `probabilidadId` IS NULL MUST be excluded from the matrix entirely.

#### Scenario: Null probabilidadId asset skipped

- GIVEN a ValoracionActivo with probabilidadId = null and valid CIA rows
- WHEN the heatmap is computed
- THEN that asset contributes zero to all cell counts

### Requirement: ApexCharts Response Structure

Each series MUST follow `{ name: "N. Label", data: [{ x: "N. Label", y: count }] }`. Labels use Spanish: `1. Bajo`, `2. Medio`, `3. Alto`. All 3 probability columns MUST appear in every series even when `y: 0`.

#### Scenario: Response structure matches ApexCharts heatmap spec

- GIVEN the heatmap is generated
- WHEN the response is serialized
- THEN each series has `name` (string) and `data` (array of objects with `x` string and `y` number)
- AND every series contains exactly 3 data points for all probability levels

### Requirement: Error Handling on DB Failure

The endpoint MUST return HTTP 500 with a meaningful JSON error message if the database query fails.

#### Scenario: Database connection failure

- GIVEN the database connection is unavailable
- WHEN `GET /reportes/heatmap` is called
- THEN response status is 500 with a descriptive error message in the body
