# recalculo-riesgo Specification

## Purpose

Endpoint que recalcula todos los valores de riesgo (evaluacionRiesgo, nivelRiesgo) para un ValoracionActivo y sus DetalleRiesgo hijos, usando los inputs actuales en base de datos. No modifica DTOs del usuario — solo re-ejecuta `calculateRiesgo` con VA derivado de `ValoracionActivo.impacto`.

## Requirements

### Requirement: POST /valoraciones/:id/recalcular

El endpoint POST `/valoraciones/:id/recalcular` DEBE recalcular todos los DetalleRiesgo hijos y el ValoracionActivo padre del activo identificado por `:id`. DEBE usar `ValoracionActivo.impacto` como VA (fallback 3 si null). DEBE persistir `evaluacionRiesgo` y `nivelRiesgo` en cada fila recalculada.

#### Scenario: Recalculo exitoso con impacto definido

- GIVEN un ValoracionActivo con `id = 1`, `impacto = 2`, y 3 DetalleRiesgo hijos con amenazas y vulnerabilidades seteadas
- WHEN se llama `POST /valoraciones/1/recalcular`
- THEN cada DetalleRiesgo.evaluacionRiesgo se recalcula con VA=2
- AND ValoracionActivo.evaluacionRiesgo se actualiza al máximo de sus hijos
- AND retorna 200 con conteo de filas recalculadas

#### Scenario: Recalculo con impacto null usa fallback

- GIVEN un ValoracionActivo con `impacto = null`
- WHEN se ejecuta el recalculo
- THEN VA fallback es 3

#### Scenario: Activo sin detalles retorna ok

- GIVEN un ValoracionActivo sin DetalleRiesgo hijos
- WHEN se llama el endpoint
- THEN retorna 200 con mensaje "sin detalles que recalcular"

#### Scenario: Activo no encontrado retorna 404

- GIVEN no existe ValoracionActivo con `id = 999`
- WHEN se llama `POST /valoraciones/999/recalcular`
- THEN retorna 404
