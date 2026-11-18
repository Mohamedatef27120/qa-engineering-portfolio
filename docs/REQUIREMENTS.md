# TaskFlow QA Requirements

## Purpose

This document is the testable product contract for TaskFlow QA. Requirements use stable IDs so test cases and automated tests can trace back to business behavior.

## Actors

| Actor          | Description                                                                                                   |
| -------------- | ------------------------------------------------------------------------------------------------------------- |
| Writer         | Authenticated demo user who can view, create, edit, and delete tasks in the writer's workspace.               |
| Viewer         | Authenticated demo user who can view tasks in the viewer's workspace but cannot create, edit, or delete them. |
| Anonymous user | Visitor without a valid authenticated session.                                                                |

## Functional Requirements

### Authentication

| ID           | Requirement                                                             | Acceptance criteria                                                                                                                 |
| ------------ | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| REQ-AUTH-001 | A user can sign in with valid demo credentials.                         | Valid writer or viewer credentials produce an authenticated session and open the task list.                                         |
| REQ-AUTH-002 | Invalid credentials are rejected.                                       | The response does not reveal whether the username or password was wrong; the UI shows a clear error and remains on login.           |
| REQ-AUTH-003 | Protected UI routes and API endpoints require authentication.           | Anonymous access receives a login redirect in the UI or `401` from the API.                                                         |
| REQ-AUTH-004 | A signed-in user can sign out.                                          | `POST /api/auth/logout` returns `204`, invalidates the bearer token, and protected content is no longer accessible with that token. |
| REQ-AUTH-005 | Authorization is enforced by role.                                      | Writers may mutate tasks; viewers receive `403` and no data change for create, update, and delete attempts.                         |
| REQ-AUTH-006 | Each authenticated session is bound to the workspace selected at login. | Reusing a valid bearer token with a different `X-Workspace-Id` returns `403` with error code `WORKSPACE_FORBIDDEN`.                 |

### Task Management

| ID           | Requirement                                                                         | Acceptance criteria                                                                                                        |
| ------------ | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| REQ-TASK-001 | An authenticated user can list tasks in their workspace.                            | The UI and `GET /api/tasks` return only tasks belonging to that user's workspace.                                          |
| REQ-TASK-002 | A writer can create a task.                                                         | A valid task is stored, assigned a unique ID, belongs to the writer's workspace, and is returned with all supplied fields. |
| REQ-TASK-003 | A task title is required and contains 1–80 characters after trimming.               | Empty/whitespace titles and titles longer than 80 characters are rejected; lengths 1 and 80 are accepted.                  |
| REQ-TASK-004 | A description is optional and contains at most 500 characters.                      | Omitted, empty, and 500-character descriptions are accepted; 501 characters are rejected.                                  |
| REQ-TASK-005 | Priority is one of `low`, `medium`, or `high`.                                      | Other values, wrong casing, wrong types, and missing required priority are rejected.                                       |
| REQ-TASK-006 | Status is optional on create and otherwise one of `todo`, `in-progress`, or `done`. | Omitted create status defaults to `todo`; a supplied unsupported value, wrong casing, or wrong type is rejected.           |
| REQ-TASK-007 | Due date is optional and, when provided, is a valid ISO `YYYY-MM-DD` calendar date. | Omitted/null dates and valid dates are accepted; malformed or impossible dates are rejected.                               |
| REQ-TASK-008 | A writer can update an existing task.                                               | Valid supplied fields change; the task ID and workspace remain unchanged; validation rules also apply to updates.          |
| REQ-TASK-009 | A writer can delete an existing task.                                               | The task is removed and subsequent reads by ID return `404`.                                                               |
| REQ-TASK-010 | Missing task identifiers are handled consistently.                                  | Read, update, and delete requests for a well-formed but unknown ID return `404` without altering data.                     |
| REQ-TASK-011 | Invalid task payloads do not partially change data.                                 | A rejected create/update leaves the task collection and prior task values unchanged.                                       |

### Search and Filters

| ID            | Requirement                                      | Acceptance criteria                                                                                 |
| ------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| REQ-QUERY-001 | A user can search tasks by title or description. | Case-insensitive substring search returns matching workspace tasks and excludes non-matches.        |
| REQ-QUERY-002 | A user can filter tasks by status.               | Each supported status returns only tasks with that status; an unsupported status is rejected.       |
| REQ-QUERY-003 | A user can filter tasks by priority.             | Each supported priority returns only tasks with that priority; an unsupported priority is rejected. |
| REQ-QUERY-004 | Search and filters can be combined.              | Results satisfy every supplied criterion and remain within the authenticated workspace.             |
| REQ-QUERY-005 | An empty result is a valid result.               | The UI shows a clear empty state and the API returns an empty task array, not an error.             |

### Workspace Isolation

| ID          | Requirement                                                                                   | Acceptance criteria                                                                                                       |
| ----------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| REQ-ISO-001 | Users can access only tasks in the workspace bound to their authenticated session.            | A token cannot be reused with another `X-Workspace-Id`; foreign tasks are absent and cannot be read, updated, or deleted. |
| REQ-ISO-002 | Authorization checks use the bound session, not client-supplied identity or ownership fields. | Supplying `id`, `workspaceId`, or other unknown identity fields is rejected and cannot grant cross-workspace access.      |

### Operability and Testability

| ID          | Requirement                                                                         | Acceptance criteria                                                                                                                                                                                         |
| ----------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REQ-OPS-001 | The service exposes a health endpoint.                                              | `GET /health` returns `200` with `{ "status": "ok", "service": "taskflow-api" }` while the app is ready.                                                                                                    |
| REQ-OPS-002 | A writer can empty their bound workspace through test support when test mode is on. | With `TEST_MODE=true`, `POST /api/test-support/reset` requires a valid workspace-bound writer session, removes every task in that workspace, leaves other workspaces unchanged, and returns a reset result. |
| REQ-OPS-003 | Test reset is unavailable outside test mode and to unauthorized actors.             | When `TEST_MODE` is not `true`, the route is unavailable; missing or invalid authentication is rejected with `401`, and an authenticated viewer is rejected with `403`.                                     |
| REQ-OPS-004 | API errors use a consistent safe shape.                                             | Validation/authentication/not-found responses contain a machine-readable error code and readable message, without stack traces or sensitive data.                                                           |
| REQ-OPS-005 | Version 1 data is intentionally held in memory.                                     | Starting or restarting the server produces empty task storage; persistence across server restarts is not promised.                                                                                          |

## API Behavior Conventions

- Success responses use the appropriate `2xx` status.
- Validation failures use `400`.
- Missing/invalid authentication uses `401`.
- Authenticated but unauthorized mutation or workspace mismatch uses `403`.
- Unknown accessible resources use `404`.
- JSON request bodies require `Content-Type: application/json`.
- IDs are server-generated and immutable.

## Non-Functional Requirements

| ID      | Requirement          | Acceptance criteria                                                                                                  |
| ------- | -------------------- | -------------------------------------------------------------------------------------------------------------------- |
| NFR-001 | Accessibility basics | Forms have associated labels, actions are keyboard operable, focus is visible, and errors are announced/readable.    |
| NFR-002 | Responsive usability | Core login and task workflows remain usable at 375 px and 1280 px viewport widths without horizontal page scrolling. |
| NFR-003 | Determinism          | Tests do not depend on execution order, external APIs, arbitrary fixed waits, or shared remote state.                |
| NFR-004 | Diagnostic evidence  | Failed UI tests retain a screenshot and trace; test runs generate HTML and JUnit reports.                            |
| NFR-005 | Security hygiene     | No production secret or personal data is committed; demo credentials are explicitly non-sensitive fixtures.          |

## Out of Scope for Version 1

- Public registration, password reset, email, or multi-factor authentication.
- File attachments, comments, notifications, recurring tasks, and drag-and-drop boards.
- Production deployment, durable persistence/database migration, and performance/load certification.
- Mobile native applications.
- Compliance certification and full penetration testing.
