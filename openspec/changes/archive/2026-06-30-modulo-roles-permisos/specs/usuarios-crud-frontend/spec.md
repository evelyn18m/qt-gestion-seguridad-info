# Delta for usuarios-crud-frontend

## MODIFIED Requirements

### Requirement: Edit usuario fields

The system MUST provide an edit modal per row with `email` (text), `habilitado` (toggle/checkbox), and `roles` (checkboxes or multi-select with predefined options `['administrador', 'usuario']`) fields. Saving SHALL call `PATCH /usuarios/:id` with the modified fields.
(Previously: roles was a free-text textarea)

#### Scenario: Edit roles with checkboxes

- GIVEN edit icon clicked on a user row
- WHEN roles checkboxes are toggled
- THEN selected roles array reflects checked values
- AND save calls `PATCH /usuarios/:id` with `{ email, habilitado, roles }`

#### Scenario: Save with no roles selected

- GIVEN edit modal open, all role checkboxes unchecked
- WHEN save is clicked
- THEN `roles: []` is sent in PATCH payload
- AND on success, modal closes and table refreshes

#### Scenario: Network error on edit

- GIVEN edit modal open with changes
- WHEN save triggers a network failure
- THEN error message is displayed, modal stays open preserving edits
