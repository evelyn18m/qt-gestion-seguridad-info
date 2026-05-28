-- Migration: backfill_analisis_riesgo_row_columns.sql
-- Description: Backfill amenazaIds/vulnerabilidadIds from tipo+catalogoId on existing DetalleRiesgo rows
-- Execution: docker compose exec backend mysql -u sgsi_user -p sgsi_db < backend/prisma/migrations/backfill_analisis_riesgo_row_columns.sql

-- Backfill amenaza rows: tipo='amenaza' + catalogoId → amenazaIds as JSON array
UPDATE DetalleRiesgo
SET amenazaIds = CONCAT('[', catalogoId, ']')
WHERE tipo = 'amenaza'
  AND catalogoId IS NOT NULL
  AND (amenazaIds IS NULL OR amenazaIds = '');

-- Backfill vulnerabilidad rows: tipo='vulnerabilidad' + catalogoId → vulnerabilidadIds as JSON array
UPDATE DetalleRiesgo
SET vulnerabilidadIds = CONCAT('[', catalogoId, ']')
WHERE tipo = 'vulnerabilidad'
  AND catalogoId IS NOT NULL
  AND (vulnerabilidadIds IS NULL OR vulnerabilidadIds = '');

-- Deprecate: tipo and catalogoId remain for Tab 3/4 backward compat
