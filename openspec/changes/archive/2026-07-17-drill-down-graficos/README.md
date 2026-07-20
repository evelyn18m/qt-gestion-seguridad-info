# drill-down-graficos — Resumen de cambio archivado

## Resumen

Implementación de drill-down en el dashboard de Inicio: al hacer clic en segmentos de los gráficos de Valoración CIA o Nivel de Riesgo, o en barras de Amenazas/Vulnerabilidades por activo, se abre un panel inline con el detalle filtrado correspondiente.

## Decisiones clave

- Reutilizar el patrón de panel expandible de `frontend/pages/reportes/mapa-calor.vue` en `frontend/pages/index.vue`.
- Filtros CIA en backend resolviendo IDs de `Impacto` y aplicando `in` en la consulta de `ValoracionActivo`; el matching case-insensitive se hace en memoria porque Prisma MariaDB rechaza `mode: 'insensitive'`.
- Filtro `nivelRiesgo` con `equals` aprovechando la collation de la base de datos.
- Drill-down de barras filtrado client-side sobre los datos de `analisisRiesgo` ya cargados.
- Validación manual en el controller (sin DTO/class-validator) para mantener consistencia con el patrón existente.

## Estado de verificación

- Backend tests: 388 pasaron / 0 fallaron (29 suites).
- Backend build: OK.
- Frontend build: OK.
- Veredicto: `PASS WITH WARNINGS`.
- Cobertura promedio de archivos modificados: 94.3 % líneas.
- No hay issues CRÍTICOS.

## Elementos pendientes / bloqueadores

- **Verificación manual de UI**: requiere stack en vivo y clic en cada gráfico (Phase 4.1–4.3 de `tasks.md`). No se ejecutó durante la verificación.
- **Excepción de presupuesto de revisión**: diff de 451 líneas (388 insertions + 63 deletions) excede el límite de 400 líneas; documentado en el verify report y requiere aprobación del mantenedor.
- **Tests automatizados de frontend**: los escenarios de drill-down UI no tienen tests automáticos; se recomienda agregarlos cuando se disponga de Vue Test Utils / Playwright.

## Notas adicionales

- Se corrigieron dos test failures preexistentes en `reportes.service.spec.ts` (filtro `custodioId` y dato de test) como parte de la implementación.
- No se requieren migraciones de base de datos.

## Ubicación de archivos

- Especificación fuente de verdad: `openspec/specs/dashboard/spec.md`
- Archivo de cambio archivado: `openspec/changes/archive/2026-07-17-drill-down-graficos/`
