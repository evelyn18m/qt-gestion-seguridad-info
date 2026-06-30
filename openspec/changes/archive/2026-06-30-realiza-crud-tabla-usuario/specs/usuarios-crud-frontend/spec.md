# Delta for usuarios-crud-frontend

## ADDED Requirements

### Requirement: Create usuario with password display

The system MUST provide a modal form with `username` (required) and `email` (required) fields. On successful `POST /usuarios`, the response's `contraseñaGenerada` SHALL be displayed prominently with a copy-to-clipboard button. The submit button SHALL be disabled when required fields are empty.

#### Scenario: Successful creation with password display

- GIVEN user on `/usuarios` page with create modal open
- WHEN valid username and email are submitted
- THEN `POST /usuarios` is called
- AND modal shows `contraseñaGenerada` with a copy button
- AND `navigator.clipboard.writeText` copies the password on click

#### Scenario: Empty fields block submission

- GIVEN create modal open
- WHEN username or email is empty
- THEN submit button is disabled

#### Scenario: Duplicate username error

- GIVEN a username already exists
- WHEN attempting to create with the same username
- THEN API error message is displayed to user in the modal

### Requirement: Edit usuario fields

The system MUST provide an edit modal per row with `email` (text), `habilitado` (toggle/checkbox), and `roles` (textarea) fields. Saving SHALL call `PATCH /usuarios/:id` with the modified fields.

#### Scenario: Edit and save

- GIVEN edit icon clicked on a user row
- WHEN fields are modified and save is clicked
- THEN `PATCH /usuarios/:id` called with `{ email, habilitado, roles }`
- AND on success, modal closes and table refreshes

#### Scenario: Network error on edit

- GIVEN edit modal open with changes
- WHEN save triggers a network failure
- THEN error message is displayed, modal stays open preserving edits

### Requirement: Delete usuario with confirmation

The system MUST show a confirmation dialog before deletion. Confirming SHALL call `DELETE /usuarios/:id` and refresh the list. Cancelling MUST NOT make any API call.

#### Scenario: Delete confirmed

- GIVEN delete icon clicked on a user row
- WHEN confirmation dialog is shown and user confirms
- THEN `DELETE /usuarios/:id` is called
- AND on success, table refreshes and row is absent

#### Scenario: Delete cancelled

- GIVEN delete confirmation dialog open
- WHEN user clicks cancel
- THEN no API call is made, dialog closes, row unchanged

### Requirement: List refresh after mutation

After any successful create, update, or delete, the system SHALL re-fetch the user list so the table reflects current state.

#### Scenario: Table updates post-mutation

- GIVEN any create, edit, or delete succeeds
- WHEN the operation completes
- THEN the user list is re-fetched via `GET /usuarios`
- AND the table renders the updated data

## MODIFIED Requirements

None.

## REMOVED Requirements

None.
