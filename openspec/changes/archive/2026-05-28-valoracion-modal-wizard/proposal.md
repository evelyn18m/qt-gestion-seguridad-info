# Proposal: ValoracionModal — Tabs to Wizard Conversion

## Intent

Convert `ValoracionModal`'s free tab navigation into a guided wizard/stepper flow. Current UX allows jumping between tabs freely; wizard enforces sequential completion with validation gates before advancing.

## Scope

### In Scope
- Replace `.val-tabs` (button row) with `.val-stepper` (horizontal step indicator: numbered circles + labels)
- Add local `currentStep` ref in modal (replaces `activeTab` prop from parent)
- Back/Next buttons in footer: Next validates current step before advancing; Back never fails
- "Guardar" button only on Step 4, replacing "Siguiente"
- Step validation gates: Step 1 required → Step 2; Step 2 requires ≥1 riskRow → Step 3; Step 3 required → Step 4
- Back button available on Steps 2–4, hidden on Step 1
- Cancel resets `currentStep` to 0 when modal closes

### Out of Scope
- Backend / API changes
- Tab 2/3/4 internal row management, evaluation, or treatment logic changes
- Parent changes beyond removing `activeTab` prop and `@tab-change` handler

## Capabilities

### Modified Capabilities
- `valoracion-modal`: Tab navigation changes from free tab access to sequential wizard with validation gates. Delta spec captures wizard-specific requirements.

## Approach

**Wizard-as-local-state in ValoracionModal:**
- Local `currentStep = ref(0)` replaces `activeTab` prop
- Step indicator: numbered circles 1–4, labels, completed = ✓, current = filled primary
- Back/Next buttons in footer between step content and Cancel/Guardar bar
- Validation per step:
  - `canAdvanceFromStep1()`: all required Tab 1 fields filled
  - `canAdvanceFromStep2()`: `riskRows.length > 0`
  - `canAdvanceFromStep3()`: all rows have `riesgoId` and `vulnerabilidadRiesgoId` selected
- Submit (Guardar) only on Step 4, same as current flow
- `watch(() => props.modelValue)` resets `currentStep = 0` on modal close

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `frontend/components/ValoracionModal.vue` | Modified | Wizard state, stepper UI, Back/Next buttons, validation gates |
| `frontend/pages/valoracion.vue` | Modified | Remove `activeTab` prop binding, remove `@tab-change` handler |
| `openspec/specs/valoracion-modal/spec.md` | Modified | Delta spec for wizard navigation requirements |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Step 2 empty row guard not enforced | Medium | `canAdvanceFromStep2()` checks `riskRows.length > 0` |
| Edit mode: wizard step state not restored | Medium | On reopen, `currentStep` resets to 0 |
| Step indicator CSS needs building from scratch | Low | Simple flexbox + CSS; reuse `.val-tab` active style |

## Rollback Plan

Revert `ValoracionModal.vue` to previous tab-based implementation; restore `activeTab` prop and `tab-change` emit; restore `.val-tabs` CSS; remove stepper CSS.

## Dependencies
- None — purely frontend UI change

## Success Criteria
- [ ] Wizard displays 4 numbered steps with labels in horizontal layout
- [ ] "Siguiente" on Step 1 validates required Tab 1 fields — blocks if incomplete
- [ ] "Siguiente" on Step 2 validates `riskRows.length > 0` — blocks if empty
- [ ] "Siguiente" on Step 3 validates all rows have amenaza and vulnerabilidad selected
- [ ] "Guardar" only appears on Step 4
- [ ] "Atrás" button available on Steps 2–4, hidden on Step 1
- [ ] "Cancelar" closes modal and resets wizard to Step 1
- [ ] Reopening modal shows Step 1 (state resets)
- [ ] Tab 2/3/4 internal behavior unchanged
