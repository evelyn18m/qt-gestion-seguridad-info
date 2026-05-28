# Exploration: subproceso-depends-of-macroproceso

## Current State

### Backend Models (Prisma Schema)

**Subproceso** and **MacroProceso** are separate flat catalog models with only `id`, `nombre`, `createdAt`, `updatedAt`:

```prisma
model Subproceso {
  id        Int      @id @default(autoincrement())
  nombre    String   @db.Text
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model MacroProceso {
  id        Int      @id @default(autoincrement())
  nombre    String   @db.Text
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

**Key observation**: These are pure catalogs — no relationship to each other. They are used as foreign keys in `ValoracionActivo` (via `macroProcesoId` and `subProcesoId`), but not to each other.

### Backend API

Catalogs are managed through a generic `CatalogosService`/`CatalogosController` pair at `/catalogos/:tipo`. All CRUD is delegated via `TIPO_MAP`:

- `subprocesos` → `subproceso` model
- `macroprocesos` → `macroProceso` model

No custom endpoints exist for subprocess-to-macroprocess relationships.

### Frontend

- `/pages/catalogos.vue` — generic catalog UI that handles `subprocesos` and `macroprocesos` as separate catalog types
- `/pages/valoracion.vue` — uses both as dropdown selects when creating `ValoracionActivo`
- No existing UI for managing subprocess-macroprocess dependencies

---

## Affected Areas

| Area | File | Why Affected |
|------|------|--------------|
| **Prisma Schema** | `backend/prisma/schema.prisma` | Need to add `macroProcesoId` to Subproceso (or a junction table for many-to-many) |
| **Prisma Seed** | `backend/prisma/seed.ts` | May need to establish initial relationships in seed data |
| **CatalogosService** | `backend/src/catalogos/catalogos.service.ts` | `FIELD_MAP` would need a new `macroProcesoId` entry for `subproceso` type |
| **CatalogosController** | `backend/src/catalogos/catalogos.controller.ts` | Already generic — no changes needed if using existing endpoints |
| **Frontend Catalog UI** | `frontend/pages/catalogos.vue` | `FIELD_MAP` would need `macroProcesoId` field for subprocess form |
| **OpenSpec** | `openspec/changes/subproceso-depends-of-macroproceso/exploration.md` | This artifact |

---

## Approaches

### 1. **Subproceso has foreign key to MacroProceso (one-to-many)**

Subproceso gets `macroProcesoId: Int?` pointing to MacroProceso. A subprocess belongs to ONE macroprocess.

- **Pros**: Simple schema change, easy to query ("what subprocesses depend on macroprocess X?")
- **Cons**: A subprocess can only belong to one macroprocess. If the domain requires a subprocess to depend on MULTIPLE macroprocesses, this is insufficient.
- **Effort**: Low

### 2. **Junction table (many-to-many)**

A `SubprocesoMacroProceso` junction table with `subprocesoId` and `macroProcesoId`. A subprocess can depend on multiple macroprocesses.

- **Pros**: Flexible — supports any dependency graph, including cyclic detection later
- **Cons**: More complex queries, more UI work to manage the relationship
- **Effort**: Medium

### 3. **Subproceso has optional single FK + add a junction later**

Start with Approach 1 as a v1, knowing migration to Approach 2 is straightforward.

- **Pros**: Quick win, low risk
- **Cons**: Schema migration needed if requirements expand
- **Effort**: Low (same as Approach 1)

---

## Recommendation

**Approach 1** (`Subproceso.macroProcesoId` FK) is the right starting point unless the domain explicitly requires a subprocess to depend on multiple macroprocesses.

Rationale:
- The change name "subproceso depends of macroproceso" suggests a single dependency per subprocess
- It's the simplest change (one field + seed data update)
- The existing generic catalog API already supports the CRUD pattern with minimal changes
- Frontend can reuse the existing catalog form with one additional select

---

## Risks

1. **Cascading deletes**: If a MacroProceso is deleted, what happens to dependent Subprocesos? Need to decide (restrict / set null / cascade)
2. **Seed data**: The initial `catalogos.json` / seed may not have macroproceso references for subprocesses — needs verification
3. **UI UX**: The catalog form doesn't currently support relations — adding a `macroProcesoId` select to the subprocess form requires extending the generic form logic
4. **Domain semantics**: "Depends on" is a directed relationship — need to confirm if subprocess → macroprocess is the correct direction (vs. macroprocess → subprocess composition)

---

## Ready for Proposal

**Yes** — with the clarification needed:

> **Clarification needed from user**: Can a single Subproceso depend on **multiple** Macroprocesos, or is it always a 1:1 relationship?

This affects whether we implement Approach 1 (1:many) or Approach 2 (many-to-many junction table).

---

## Next Steps

1. User clarifies cardinality (1:1 vs many-to-many)
2. `sdd-propose` creates the proposal with the chosen schema approach
3. `sdd-spec` defines the new field behavior and UI expectations
4. `sdd-design` details the Prisma migration, API changes, and frontend form extension