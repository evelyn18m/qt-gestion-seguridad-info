# Design: Reestructurar Catálogo Riesgo como Impacto

## Technical Approach

**Approach B: db push + reseed.** Drop `evaluacion`, add `tipo`/`nivel`, make `valor` non-nullable. Then clear orphaned `DetalleRiesgo` rows and reseed. Zero changes to risk calculation engine — `r?.valor ?? 1` is forward-compatible with `valor: Int`.

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Migration strategy | `prisma db push` + reseed | Dev environment, no production data; avoids complex multi-step Prisma migration with raw SQL transforms |
| `valor` field | Required `Int` (was `Int?`) | `r?.valor ?? 1` handles both; removing nullability eliminates header rows (valor=null) |
| Seed parser | Section-aware, same pattern as Impacto seed (line 184) | Proven pattern: `currentImpactType` tracking → `currentTipo` for Amenaza/Vulnerabilidad |
| `valor` semantics | 3=Alto, 2=Medio, 1=Bajo (unchanged) | `calculateRiesgo(va, nivelAmenaza, nivelVulnerabilidad)` uses numeric multiplication — identical output |

## Data Flow

```
catalogos.json (8 rows w/ headers)
    │
    ▼
seed.ts section-aware parser
    ├── header "Evaluacion de Amenaza"    → sets currentTipo = "Amenaza"
    ├── header "Evaluacion de Vulnerabilidad" → sets currentTipo = "Vulnerabilidad"
    └── data "Alto (3)" → { tipo: currentTipo, nivel: "Alto", valor: 3 }
    │
    ▼
Riesgo table: 6 rows (Alto/Medio/Bajo × Amenaza/Vulnerabilidad)
    │
    ▼
GET /catalogos/riesgos → { id, tipo, nivel, valor }
    │
    ▼
ValoracionModal: r.tipo === 'Amenaza' filter, {{ r.nivel }} ({{ r.valor }}) display
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `backend/prisma/schema.prisma` L174-180 | Modify | `evaluacion String` + `valor Int?` → `tipo String` + `nivel String` + `valor Int` |
| `backend/prisma/seed.ts` L227-240 | Modify | Section-aware parser tracking `currentTipo`; skip header rows |
| `backend/src/catalogos/catalogos.service.ts` L38 | Modify | `FIELD_MAP.riesgo: ['evaluacion','valor']` → `['tipo','nivel','valor']` |
| `frontend/pages/catalogos.vue` L54 | Modify | `FIELD_MAP.riesgos: ['evaluacion','valor']` → `['tipo','nivel','valor']` |
| `frontend/components/ValoracionModal.vue` L814 | Modify | `r.evaluacion?.toLowerCase().includes('amenaza')` → `r.tipo === 'Amenaza'`; display `{{ r.nivel }} ({{ r.valor }})` |
| `frontend/components/ValoracionModal.vue` L823 | Modify | `r.evaluacion?.toLowerCase().includes('vulnerabilidad')` → `r.tipo === 'Vulnerabilidad'`; display `{{ r.nivel }} ({{ r.valor }})` |
| `frontend/components/ValoracionModal.vue` L898 | Modify | `{{ r.evaluacion }}` → `{{ r.tipo }} - {{ r.nivel }} ({{ r.valor }})` |

**Files confirmed NO CHANGE needed**: `valoraciones.service.ts` (uses `r?.valor ?? 1`), `CatalogoManager.vue` (generic, receives `campos` prop), `ValoracionViewModal.vue` (no Riesgo references).

## Schema Diff

```diff
 model Riesgo {
   id          Int      @id @default(autoincrement())
-  evaluacion  String   @db.Text
-  valor       Int?
+  tipo        String
+  nivel       String
+  valor       Int
   createdAt   DateTime @default(now())
   updatedAt   DateTime @updatedAt
 }
```

## Seed: New Parser (replaces L227-240)

```typescript
// --- Riesgo ---
console.log('Seeding Riesgo...');
const riesgoData = data['Catalogo de Riesgo'];
let currentTipo = '';
for (const r of riesgoData) {
  const evalText: string = r['Tabla de evaluacion del Riesgo'];
  if (!evalText) continue;
  if (evalText.startsWith('Evaluacion de ')) {
    currentTipo = evalText.replace('Evaluacion de ', '').trim();
    continue;
  }
  const nivelMatch = evalText.match(/(.*)\((\d)\)/);
  if (nivelMatch && currentTipo) {
    await prisma.riesgo.create({
      data: { tipo: currentTipo, nivel: nivelMatch[1].trim(), valor: parseInt(nivelMatch[2]) },
    });
  }
}
```

## Seed Data (6 rows)

| tipo | nivel | valor |
|------|-------|-------|
| Amenaza | Alto | 3 |
| Amenaza | Medio | 2 |
| Amenaza | Bajo | 1 |
| Vulnerabilidad | Alto | 3 |
| Vulnerabilidad | Medio | 2 |
| Vulnerabilidad | Bajo | 1 |

## DetalleRiesgo Cleanup

| Step | Command | Purpose |
|------|---------|---------|
| Before reseed | `DELETE FROM DetalleRiesgo` | FK references stale after table recreate |
| Alternative | Accept stale refs | Only valid if no valoraciones exist in dev |

## Testing Strategy

| Layer | What | How |
|-------|------|-----|
| Unit (backend) | Seed inserts 6 Riesgo rows with correct `tipo`/`nivel`/`valor` | `prisma.riesgo.findMany()` after seed, assert count=6, verify structure |
| Unit (backend) | `FIELD_MAP` returns `['tipo','nivel','valor']` | `catalogos.service.spec.ts` — assert FIELD_MAP.riesgo |
| Integration | `GET /catalogos/riesgos` returns new schema | Supertest: assert each item has `tipo`, `nivel`, `valor` (no `evaluacion`) |
| Smoke (frontend) | ValoracionModal dropdowns filter and display correctly | Manual: open modal, verify Amenaza/Vulnerabilidad dropdowns show `Alto(3)` etc. |

## Rollback

| Step | Command/Action |
|------|---------------|
| 1 | Revert `schema.prisma` to `evaluacion String` + `valor Int?` |
| 2 | `docker compose exec backend npx prisma db push` |
| 3 | Revert `seed.ts` L227-240 to original flat parser |
| 4 | Revert `FIELD_MAP` (L38 backend, L54 frontend) |
| 5 | Revert ValoracionModal.vue L814/823/898 to `r.evaluacion` references |
| 6 | Reseed |
| **Time** | < 5 minutes |
