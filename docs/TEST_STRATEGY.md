# Test Strategy

## Strategy Summary

TaskFlow QA uses a risk-based, API-heavy automation strategy. Business rules are exercised primarily through the REST API because those tests are fast and precise. A smaller UI suite proves that the same critical workflows work from a user's perspective. Manual exploratory testing covers usability, accessibility, and unexpected interactions that scripted checks may miss.

## Quality Risks Drive Coverage

The highest risks are unauthorized mutation, cross-workspace data exposure, incorrect validation, and nondeterministic CI. Those risks receive P0/P1 API coverage and at least one user-facing UI check where appropriate. Cosmetic presentation receives lower priority.

```text
                 Focused UI E2E
          critical workflows and visibility
       API contract and business-rule coverage
  static checks + deterministic test-data foundation
```

This is a coverage model, not a claim about production quality. The verified local evidence from 2026-11-18 is: API 33/33 passed; Chromium UI 13/13 passed; Chromium integration 1/1 passed; the default 47-test regression passed twice (94/94 total); and WebKit UI 13/13 passed. Final post-expansion formatting, lint, type-check, and build gates passed locally. Manual and exploratory cases remain unexecuted, and CI has not run.

## Coverage by Layer

### Static Quality Gates

- TypeScript compilation without emitting output.
- ESLint for correctness and maintainability rules.
- Prettier check for consistent formatting.
- Secret/sensitive-file review before publication.

### API Automation

The implemented 33-test API suite covers health/readiness; valid and invalid login plus non-object payload validation; missing and invalid bearer tokens; viewer read/create/update/delete authorization; workspace-bound tokens; logout invalidation; anonymous/viewer reset denial; a new empty workspace; create/default status; title lengths 1, 80, 81, missing, and whitespace-only; omitted/empty/500/501-character descriptions; representative invalid priority, status, and due date; GET/PATCH/DELETE lifecycle; atomic rejected update; combined search/status/priority filtering; case-insensitive description search; invalid status/priority filters; rejection of client-controlled identity fields; and unknown-ID GET/PATCH/DELETE.

The 2026-11-18 local API run passed 33/33. Planned manual cases still exceed this implemented automation. In particular, complete enum/type/date partitions, direct foreign-resource ID attempts, reset with `TEST_MODE=false`, invalid-token reset, dedicated other-workspace reset isolation, and server-restart behavior are not claimed as automated evidence.

API tests assert status codes and relevant response bodies. Lifecycle tests use independent follow-up requests where that behavior is part of the implemented case.

### UI Automation

The implemented 13-test UI suite covers the anonymous sign-in form, valid writer login, invalid-login feedback, logout/session invalidation, viewer read-only controls, task creation, blank and 81-character title validation, visibility after browser refresh, task editing, search plus status/priority filters, delete cancel/confirm, and a 375 px no-horizontal-overflow/core-control check. A separate implemented integration test creates by API, completes through the UI, and verifies through the API.

On 2026-11-18, Chromium UI passed 13/13, Chromium integration passed 1/1, and WebKit UI passed 13/13. Full mobile CRUD, desktop responsive review, empty-result behavior, and keyboard/focus exploration remain planned/manual.

The suite uses accessible role, label, and visible-text locators. Test-only IDs are acceptable only where semantic locators cannot reliably identify a stable control. Arbitrary timeouts and fixed sleeps are prohibited.

### Manual and Exploratory Testing

Manual charters focus on:

- keyboard-only operation and focus order;
- narrow/wide responsive layouts;
- error clarity and recovery;
- rapid/repeated actions;
- mixed search/filter use;
- session and back-navigation behavior;
- visual consistency and content clarity.

Exploratory notes state the environment, time box, data, observations, and genuine defects. A surprising observation is investigated before it is labeled a defect.

## Test Design

### Boundary Value Analysis

| Field              | Values                                                           |
| ------------------ | ---------------------------------------------------------------- |
| Title length       | 0, 1, 80, 81; whitespace-only                                    |
| Description length | omitted, 0, 500, 501                                             |
| Due date           | omitted/null, valid leap date, malformed format, impossible date |

### Equivalence Partitions

| Input    | Valid partitions                                  | Invalid partitions                                            |
| -------- | ------------------------------------------------- | ------------------------------------------------------------- |
| Role     | writer, viewer                                    | anonymous, invalid/expired session                            |
| Priority | low, medium, high                                 | unsupported string, wrong case, wrong type, missing           |
| Status   | omitted on create → todo; todo, in-progress, done | unsupported string, wrong case, wrong type when supplied      |
| Task ID  | existing in workspace                             | unknown, other-workspace, malformed                           |
| Search   | empty, matching, no match, mixed case             | inputs rejected by any documented query limit, if implemented |

### Authorization Decision Table

| Actor     | List/read own workspace | Create | Update | Delete | Other workspace |
| --------- | ----------------------: | -----: | -----: | -----: | --------------: |
| Writer    |                   Allow |  Allow |  Allow |  Allow |       Hide/deny |
| Viewer    |                   Allow |   Deny |   Deny |   Deny |       Hide/deny |
| Anonymous |                    Deny |   Deny |   Deny |   Deny |            Deny |

## Automation Architecture

### Fixtures

Fixtures provide reusable authenticated API clients, known demo identities, a generated workspace ID, and page setup. Login binds the bearer token to that workspace ID. Each test owns an initially empty workspace and the state it mutates. Fixture scope is kept as narrow as practical so parallel or repeated execution cannot leak data between tests.

### Page Objects

Page objects encapsulate stable interaction language such as `loginAs`, `createTask`, or `filterByStatus`. Assertions that describe business intent remain visible in test files unless a repeated component-level assertion is clearer in the page object. Page objects do not hide arbitrary waits or test data.

### Test Data

- The server starts with empty in-memory task storage; restart clears all task data.
- Each automated test uses a generated workspace ID and creates the data it needs.
- Tests create unique names when they add data.
- With `TEST_MODE=true`, writer-authenticated `POST /api/test-support/reset` empties that writer's workspace; it does not restore seed records or stable task IDs.
- Tests never depend on another test having run first.
- Time-dependent cases use explicit fixed dates rather than “today” where possible.
- Cross-workspace records, when a planned isolation case needs them, must be created explicitly in separate workspaces.

### Environment Configuration

The base URL and environment mode come from configuration, with safe local defaults. No credentials used by real people are stored. Demo credentials are fixtures for a local training application and are labeled accordingly. Login sessions are bound to the supplied workspace header; logout invalidates the token. Reset is enabled only when `TEST_MODE=true`, requires a valid bound writer session, and empties that session's workspace.

## Assertions and Evidence

Assertions verify observable behavior rather than implementation details:

- HTTP status and relevant JSON contract;
- user-visible success/error state;
- persistence through a follow-up read or page reload;
- absence of unauthorized controls/data;
- unchanged state after rejected operations.

Playwright produces HTML and JUnit reports. UI failures retain a screenshot and trace according to configuration. Traces and screenshots are diagnostic artifacts, not substitutes for clear assertions.

## Reliability and Flake Control

- Start from a unique empty workspace and create scenario-owned data.
- Wait for readiness via the health endpoint.
- Use Playwright auto-waiting and web-first assertions.
- Never use fixed delays as synchronization.
- Avoid order-dependent tests and shared mutable remote data.
- Retry only in CI and retain the first-failure trace; retries do not convert a flaky test into a pass without investigation.
- Run the full suite at least twice during final verification to look for inconsistent outcomes.
- Classify a failure as product, test, data, or environment before fixing it.

## Browser Strategy

Chromium is the required regression browser because it balances recruiter reproducibility and run time. On 2026-11-18, Chromium UI passed 13/13 and integration passed 1/1; the default 47-test regression passed twice for 94/94 total repeatability evidence; WebKit UI passed 13/13. Firefox executed 0 tests because the Playwright Firefox process crashed before page access in this Windows sandbox with `NS_ERROR_FAILURE` while attempting registry access. That launch failure is an infrastructure limitation, not a product defect or Firefox pass/fail result. A focused 375 px check passed; the complete mobile manual workflow and 1280 px review remain planned.

## CI Quality Gates

The intended pipeline order is:

1. Install locked dependencies.
2. Install required Playwright browser dependencies.
3. Run formatting, lint, and type checks.
4. Start the app with `TEST_MODE=true` and wait on `GET /health`.
5. Run API tests.
6. Run UI regression/smoke tests.
7. Upload reports, screenshots, and traces even when a test fails.

Required checks fail the workflow on failure. Artifact upload uses an `always()` condition so debugging evidence survives a red run. This workflow is configured but has not run because the repository is unpublished; no CI success is claimed.

## Regression Selection

| Tag/suite          | Contents                                                                    | When                                                  |
| ------------------ | --------------------------------------------------------------------------- | ----------------------------------------------------- |
| Smoke              | Health, writer login, task list, one create/read path                       | Every CI run and fast local check                     |
| API                | Implemented contract/business-rule regression; gaps tracked in traceability | Every pull request and final verification             |
| UI                 | Implemented critical writer journeys and authentication checks              | Every pull request and final verification             |
| Cross-browser      | Critical smoke only                                                         | Final verification or scheduled/explicit run          |
| Manual exploratory | Charter-based usability/interaction work                                    | Before release milestone and when UI behavior changes |

## Maintenance Rules

- Update the requirement and traceability entry when behavior changes.
- Add a regression test for every fixed genuine defect when practical.
- Prefer a clearer locator or test-data seam over adding a wait/retry.
- Remove redundant tests that add run time without a distinct risk assertion.
- Review reports and documentation after changes; generated evidence must match the current commit.
