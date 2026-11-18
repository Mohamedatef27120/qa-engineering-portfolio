# Exploratory Testing

## Purpose

Scripted checks confirm known expectations. Exploratory testing investigates how the product behaves when a tester learns, designs, and executes tests at the same time. These charters are planned; no session or observation is claimed until a dated session record is added.

The successful 2026-11-18 local and hosted automated runs do not count as exploratory sessions. All six charters below remain unexecuted. Firefox's local pre-page-access sandbox crash is an environment observation, while the successful hosted Firefox job is automated compatibility evidence; neither is an exploratory session.

## Session Rules

- Start with a unique empty workspace, or—with `TEST_MODE=true` and valid writer bearer authentication—use `POST /api/test-support/reset` to empty that writer's workspace. Record any data created for the session.
- Time-box each charter, normally 30–45 minutes.
- Record browser, viewport, commit/build, actor, and relevant data.
- Capture concise notes and evidence while exploring.
- Separate observations from confirmed defects.
- Reproduce and compare behavior with `REQUIREMENTS.md` before filing a defect.
- Never use personal or sensitive information as test data.

## Charter ET-01 — Permissions and Workspace Boundaries

**Mission:** Explore whether viewer/anonymous users or a writer from one workspace can see or change data they do not own.

**Risks:** Broken access control, UI-only authorization, predictable IDs, mass assignment, data disclosure through errors/search.

**Test ideas:**

- Switch between writer, viewer, and anonymous sessions.
- Reuse a valid token with a different `X-Workspace-Id` and compare the result with `WORKSPACE_FORBIDDEN`.
- Remove/alter authentication state and repeat requests.
- Use a known foreign task ID in read, edit, and delete routes.
- Supply ownership/workspace fields in create/update bodies.
- Search for a phrase known to exist only in another workspace.
- Navigate back after logout and inspect whether cached data remains actionable.

**Oracle:** REQ-AUTH-003–005 and REQ-ISO-001–002.

**Time box:** 45 minutes.

## Charter ET-02 — Task Form Boundaries and Recovery

**Mission:** Explore validation, normalization, error clarity, and recovery while creating and editing tasks.

**Risks:** Off-by-one errors, whitespace ambiguity, partial updates, lost input, inconsistent UI/API validation.

**Test ideas:**

- Paste 0/1/80/81-character titles and 0/500/501-character descriptions.
- Use leading/trailing spaces, line breaks, emoji, apostrophes, and HTML-like text.
- Try valid and impossible dates, including leap day.
- Correct one invalid field while leaving another invalid.
- Submit rapidly or press Enter more than once.
- Cancel an edit after changing every field; reopen and check persisted state.

**Oracle:** REQ-TASK-002–008 and REQ-TASK-011.

**Time box:** 40 minutes.

## Charter ET-03 — Search, Filters, and Changing Data

**Mission:** Explore whether search and filter controls stay accurate and understandable as tasks are added, edited, deleted, and moved between statuses.

**Risks:** Stale results, incorrect AND/OR semantics, case sensitivity, filters resetting unexpectedly, duplicate cards.

**Test ideas:**

- Combine search with each status/priority pair.
- Edit a visible task so it no longer matches the current criteria.
- Delete the last matching task and inspect the empty state.
- Clear one control at a time, then clear all.
- Search by mixed case, leading/trailing whitespace, and description-only text.
- Reload and use browser back/forward while filters are active.

**Oracle:** REQ-QUERY-001–005.

**Time box:** 35 minutes.

## Charter ET-04 — Keyboard and Accessibility Basics

**Mission:** Explore whether a keyboard user can understand and complete every core workflow.

**Risks:** Invisible focus, inaccessible icon buttons, missing labels, focus traps, errors not connected to inputs.

**Test ideas:**

- Login, search, filter, create, edit, delete, cancel, and logout without a mouse.
- Confirm focus is visible and follows a logical order.
- Check accessible names for icon-only buttons using browser accessibility tools if available.
- Trigger validation and observe focus/error association.
- Zoom to 200% and inspect whether content remains operable.
- Check that dialogs/forms can be exited without losing control of focus.

**Oracle:** NFR-001 and the product's visible labels/instructions.

**Time box:** 35 minutes.

## Charter ET-05 — Responsive and Visual Resilience

**Mission:** Explore core workflows at narrow and wide widths with long but valid content.

**Risks:** Hidden actions, overlap, horizontal scrolling, clipped error text, unreadable task cards.

**Test ideas:**

- Exercise 375 px and 1280 px widths, then resize during an open form.
- Use an 80-character title and 500-character description.
- Open validation messages at narrow width.
- Inspect empty, single-task, and many-task lists.
- Use browser zoom and long localized-looking strings where practical.

**Oracle:** NFR-002 and successful completion of the core workflows.

**Time box:** 30 minutes.

## Charter ET-06 — Reliability, Refresh, and Repeated Actions

**Mission:** Explore whether rapid or interrupted interactions create duplicates, stale state, or misleading feedback.

**Risks:** Duplicate submission, race conditions, lost updates, stale UI after delete, readiness/reset instability.

**Test ideas:**

- Double-submit create/update and rapidly click delete once confirmation is accepted.
- Refresh immediately after create or update.
- Open two tabs as the same user; change a task in one and inspect the other after refresh.
- Use the writer-authenticated workspace reset between sessions and confirm the task list is empty each time; do not expect seed records or stable task IDs.
- Restart the server in an isolated check and confirm all in-memory task data is cleared as documented.
- Start the UI before the API is ready and inspect recovery once health becomes ready.
- Repeat a focused workflow several times with unique data.

**Oracle:** REQ-OPS-001–002, REQ-TASK-002, REQ-TASK-008–009, and NFR-003.

**Time box:** 40 minutes.

## Session Record Template

Copy this template for each completed session. Do not pre-fill outcomes.

```markdown
### Session ET-XX / YYYY-MM-DD

- Charter:
- Tester:
- Time box / actual duration:
- Commit or build:
- Environment:
- Browser and viewport:
- Starting data/reset state:

#### Notes and coverage

-

#### Observations requiring investigation

- Observation:
  - Evidence:
  - Requirement/oracle consulted:
  - Reproduced: Yes / No / Pending
  - Classification: Product defect / Test issue / Environment issue / Expected / Pending

#### Genuine defects filed

- None, or BUG-XXX

#### Follow-up ideas

-
```

## Baseline Session Status

| Charter                            | Status  | Evidence            |
| ---------------------------------- | ------- | ------------------- |
| ET-01 Permissions and boundaries   | Planned | None — not executed |
| ET-02 Form boundaries and recovery | Planned | None — not executed |
| ET-03 Search and filters           | Planned | None — not executed |
| ET-04 Keyboard/accessibility       | Planned | None — not executed |
| ET-05 Responsive resilience        | Planned | None — not executed |
| ET-06 Reliability/repeated actions | Planned | None — not executed |
