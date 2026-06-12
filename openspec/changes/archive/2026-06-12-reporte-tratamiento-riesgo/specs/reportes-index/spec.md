# Reportes Index — Specification

> **Change**: reporte-tratamiento-riesgo
> **Domain**: reportes-index (NEW)

## Purpose

The `GET /reportes` endpoint returns a JSON index of all available report routes with descriptions. Every new report endpoint MUST register its route entry here.

## Requirements

### Requirement: GET /reportes Returns Complete Endpoint Index

The system MUST expose `GET /reportes` returning `IndiceReporteDto` with an `endpoints` array. Each entry MUST have `ruta` and `descripcion`.

**Required entries after this change:**

| ruta | descripcion |
|------|-------------|
| `GET /reportes/resumen` | Resumen del dashboard con totales y distribuciones |
| `GET /reportes/riesgos-por-activo` | Riesgos por activo con datos enriquecidos |
| `GET /reportes/riesgos-por-macroproceso` | Riesgos agrupados por macroproceso |
| `GET /reportes/tratamiento` | Resumen de métodos de tratamiento y riesgo residual |
| `GET /reportes/cia` | Distribución de niveles CIA |
| `GET /reportes/valoracion-activos` | Reporte de valoración de activos con filtros |
| `GET /reportes/analisis-riesgo-activos` | Reporte de análisis de riesgo por activo con filtros |
| `GET /reportes/evaluacion-riesgo` | Reporte de evaluación de riesgo con 11 columnas y filtros |
| `GET /reportes/tratamiento-riesgo` | Reporte de tratamiento de riesgo con 13 columnas y filtros |
| `GET /reportes/tratamiento-riesgo/export` | Exportación Excel del reporte de tratamiento de riesgo |

#### Scenario: Index includes new tratamiento routes

- GIVEN the backend is running
- WHEN `GET /reportes` is called
- THEN the `endpoints` array includes `{ ruta: "GET /reportes/tratamiento-riesgo", descripcion: "Reporte de tratamiento de riesgo con 13 columnas y filtros" }`
- AND includes `{ ruta: "GET /reportes/tratamiento-riesgo/export", descripcion: "Exportación Excel del reporte de tratamiento de riesgo" }`

#### Scenario: Existing routes are unchanged

- GIVEN the backend is running
- WHEN `GET /reportes` is called
- THEN all previously existing route entries (resumen, riesgos-por-activo, riesgos-por-macroproceso, tratamiento, cia, valoracion-activos, analisis-riesgo-activos, evaluacion-riesgo) are still present with their original descriptions
