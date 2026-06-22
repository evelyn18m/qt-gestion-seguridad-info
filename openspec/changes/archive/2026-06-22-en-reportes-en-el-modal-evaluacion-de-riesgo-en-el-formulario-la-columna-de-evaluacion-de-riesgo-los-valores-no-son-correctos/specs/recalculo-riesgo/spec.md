# recalculo-riesgo Specification

## Purpose

Endpoint que recalcula todos los DetalleRiesgo de un ValoracionActivo usando el VA real del padre, corrigiendo filas existentes que fueron persistidas con VA=3 hardcodeado. No modifica los inputs (amenazaIds, vulnerabilidadIds, riesgoId, etc.), solo recalcula los campos derivados.

## Requirements

### Requirement: POST /valoraciones/:id/recalcular

El sistema DEBE exponer `POST /valoraciones/:id/recalcular` que, dentro de una `$transaction`, recalcula cada `DetalleRiesgo` asociado usando el VA real del `ValoracionActivo` padre y persiste los campos derivados corregidos. DEBE retornar el `ValoracionActivo` completo con sus detalles actualizados.

#### Scenario: Recalcula con VA real del padre

- GIVEN ValoracionActivo id=1 con `impacto=1.67` y 3 DetalleRiesgo previamente persistidos con `evaluacionRiesgo` inflado (VA=3)
- WHEN `POST /valoraciones/1/recalcular`
- THEN cada DetalleRiesgo se recalcula con `va=1.67`
- AND `evaluacionRiesgo` de cada fila se actualiza al valor correcto
- AND `ValoracionActivo.evaluacionRiesgo` se persiste como MAX de los hijos

#### Scenario: Retorna 404 si valoración no existe

- GIVEN no existe ValoracionActivo con id=999
- WHEN `POST /valoraciones/999/recalcular`
- THEN retorna HTTP 404

#### Scenario: No modifica inputs originales

- GIVEN DetalleRiesgo con `riesgoId=2, vulnerabilidadRiesgoId=3, amenazaIds="[1,2]"`
- WHEN se ejecuta recalcular
- THEN `riesgoId`, `vulnerabilidadRiesgoId`, y `amenazaIds` permanecen sin cambios
- AND solo `evaluacionRiesgo`, `nivelRiesgo`, `metodoTratamiento`, y campos de control se actualizan

#### Scenario: Opera en $transaction

- GIVEN hay 5 DetalleRiesgo asociados
- WHEN el recálculo del 3er detalle falla
- THEN ningún cambio se persiste (rollback completo)
- AND retorna error 500

#### Scenario: Sin detalles retorna éxito vacío

- GIVEN ValoracionActivo sin DetalleRiesgo asociados
- WHEN `POST /valoraciones/:id/recalcular`
- THEN retorna el ValoracionActivo con array de detalles vacío
- AND HTTP 200
