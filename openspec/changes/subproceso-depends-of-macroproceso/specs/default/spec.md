# Delta for subproceso-macroproceso-rel

## ADDED Requirements

### Requirement: Subproceso requires MacroProceso relationship

The system MUST assign every Subproceso a valid `macroProcesoId` foreign key. The relationship is mandatory — a Subproceso without a parent MacroProceso SHALL NOT be persisted.

### Requirement: MacroProceso code extraction from name

The system MUST extract the `codigo` field from MacroProceso names using the pattern `\((\w+)\)$` at the end of the name. For example, `"Gestión Organizacional de Desarrollo de Productos (GODPT)"` MUST produce `codigo = "GODPT"`.

### Requirement: Subproceso FK resolution by code matching

When seeding or creating a Subproceso, the system MUST resolve the `macroProcesoId` by extracting a code from the start of the Subproceso name using pattern `^\((\w+)\)` and matching it against `MacroProceso.codigo`. For example, `"(GODPT) Gestión de Desarrollo de Productos Sostenibles"` MUST resolve to the MacroProceso with `codigo = "GODPT"`.

### Requirement: MacroProceso deletion blocked when subprocesses exist

The system MUST block deletion of a MacroProceso that has child Subprocesos. The Prisma relation MUST use `onDelete: Restrict` to prevent orphaned subprocesses.

### Requirement: MacroProceso shows in Subproceso list

The system MUST display the associated MacroProceso name when listing Subprocesos in the catalog UI. Each Subproceso row MUST show `macroProceso.codigo + " - " + macroProceso.nombre`.

## ADDED Scenarios

#### Scenario: Create Subproceso with valid macroproceso

- GIVEN MacroProcesos exist in the catalog with codes "GODPT", "GAJ", "GPEI"
- WHEN a user creates a Subproceso named "(GODPT) Gestión de Desarrollo de Productos Sostenibles"
- THEN the system MUST save the Subproceso with `macroProcesoId` referencing the MacroProceso whose `codigo` is "GODPT"
- AND the Subproceso appears in the list linked to "GODPT - Gestión Organizacional..."

#### Scenario: Reject Subproceso without macroproceso

- GIVEN at least one MacroProceso exists in the catalog
- WHEN a user attempts to create a Subproceso with no code prefix (e.g., "Invalid Subproceso")
- THEN the system MUST reject the creation with a validation error
- AND no Subproceso record is created

#### Scenario: Cannot delete MacroProceso with subprocesses

- GIVEN a MacroProceso "GODPT" has at least one child Subproceso
- WHEN a user attempts to delete the MacroProceso "GODPT"
- THEN the system MUST block the deletion
- AND return an error indicating the MacroProceso has dependent subprocesses
- AND the MacroProceso record MUST remain intact

#### Scenario: MacroProceso list shows codigo

- GIVEN MacroProcesos exist in the catalog
- WHEN a user views the MacroProceso catalog
- THEN each row MUST display `codigo + " - " + nombre` (e.g., "GODPT - Gestión Organizacional de Desarrollo de Productos")