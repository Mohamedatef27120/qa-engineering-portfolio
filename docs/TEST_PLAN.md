# Test Plan

## Document Control

| Field   | Value                                    |
| ------- | ---------------------------------------- |
| Project | TaskFlow QA                              |
| Version | 1.0                                      |
| Owner   | Portfolio project owner                  |
| Date    | 2026-11-18                               |
| Status  | Approved baseline for local verification |

## Objectives

The test effort will provide evidence that TaskFlow QA:

- authenticates demo users and enforces writer/viewer permissions;
- supports reliable task CRUD within documented field boundaries;
- returns correct search and filter results;
- prevents cross-workspace data access;
- exposes predictable API status codes and error bodies;
- operates deterministically in local development and is designed for the same behavior in GitHub Actions;
- remains usable at representative desktop and mobile viewport widths.

The plan also demonstrates requirement analysis, risk-based prioritization, positive/negative testing, boundary value analysis, equivalence partitioning, exploratory testing, API/UI automation, defect reporting, and CI reporting.

## Scope

### In Scope

- Writer and viewer login/logout.
- Anonymous-route protection.
- Writer task create, read, update, and delete.
- Viewer read-only behavior.
- Workspace-bound bearer sessions and logout invalidation.
- Title, description, priority, status, and due-date validation.
- Search, status filter, priority filter, and combined queries.
- Workspace isolation through the UI and API.
- API health, error shape, and status codes.
- Writer-authenticated, workspace-scoped reset at `POST /api/test-support/reset` when `TEST_MODE=true`, plus its access restrictions.
- Chromium regression testing; focused cross-browser smoke coverage where practical.
- Basic keyboard, label, focus, responsive, and empty-state checks.

### Out of Scope

- Production readiness, durable persistence, high availability, disaster recovery, and database migration.
- Load, stress, soak, and formal performance testing.
- Full security penetration testing or compliance certification.
- Public account lifecycle, email, MFA, password recovery, and native mobile apps.
- Features listed as out of scope in `REQUIREMENTS.md`.

## Test Items

- Express/TypeScript API and static browser application.
- Public REST endpoints and authentication behavior.
- Playwright fixtures, page objects, UI specs, and API specs.
- Workspace reset behavior with `TEST_MODE=true`; in-memory storage is empty on server start/restart.
- Playwright HTML/JUnit results, screenshots, and traces.
- GitHub Actions workflow.

## Test Approach

| Level/type         | Purpose                                                              | Method                                                                           |
| ------------------ | -------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Static checks      | Catch TypeScript, lint, and formatting problems early.               | ESLint, TypeScript compiler, Prettier check.                                     |
| API functional     | Verify business rules at the fastest public boundary.                | Playwright `APIRequestContext`; unique empty workspaces and authenticated reset. |
| UI end-to-end      | Verify critical workflows through the browser.                       | Page objects/fixtures; user-visible assertions; no fixed waits.                  |
| Integration        | Verify authentication, persistence, isolation, and API/UI agreement. | API setup followed by UI/API observation.                                        |
| Manual exploratory | Find usability and interaction risks outside scripted checks.        | Time-boxed charters with evidence and notes.                                     |
| Compatibility      | Detect browser-specific regressions.                                 | Chromium regression; Firefox/WebKit smoke if the environment supports them.      |

## Test Design Techniques

- **Equivalence partitioning:** valid and invalid role, status, priority, date, and authentication classes.
- **Boundary value analysis:** title lengths 0, 1, 80, and 81; description lengths 0, 500, and 501.
- **Decision tables:** writer/viewer/anonymous versus read/create/update/delete operations.
- **State transitions:** `todo` → `in-progress` → `done`, including reverse transitions where permitted.
- **Negative testing:** malformed bodies, wrong types, unknown IDs, missing authentication, forbidden role actions, and invalid query values.
- **Risk-based testing:** access control and data isolation execute before lower-impact presentation checks.

## Test Environment

| Component        | Local                                                                                           | CI                                                                                  |
| ---------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Operating system | Developer Windows environment                                                                   | GitHub-hosted Ubuntu runner                                                         |
| Runtime          | Node.js 20 or newer; local evidence used Node.js 24                                             | Node.js 22, pinned in the workflow                                                  |
| Server           | Local Express process with `TEST_MODE=true`                                                     | Workflow-managed Express process with `TEST_MODE=true`; verified in run 44394380121 |
| Browser          | Playwright-managed Chromium and WebKit; Firefox attempted but blocked by sandbox launch failure | Chromium, Firefox, and WebKit jobs passed on GitHub-hosted Ubuntu                   |
| Data             | In-memory; empty on server start and isolated by generated workspace IDs                        | Fresh in-memory process per job; verified                                           |
| Reports          | HTML and JUnit, generated locally                                                               | HTML/JUnit plus three uploaded workflow evidence artifacts                          |

No external application, paid service, personal account, or secret is required.

## Verified Local Snapshot — 2026-11-18

On local Windows, API passed 33/33, Chromium UI passed 13/13, Chromium integration passed 1/1, and the default 47-test regression passed twice (94/94 total repeatability evidence). WebKit UI passed 13/13. Firefox executed 0 tests because its browser process crashed before page access in this sandbox with `NS_ERROR_FAILURE` during Windows registry access. Final static gates passed locally. Manual cases and exploratory charters remain unexecuted. The public repository's Actions run 44394380121 passed its quality-gates/Chromium, Firefox, and WebKit jobs; hosted Firefox success does not rewrite the blocked local result.

## Entry Criteria

- Requirements and acceptance criteria have stable IDs.
- Application dependencies install reproducibly.
- The server starts and health endpoint becomes ready.
- Demo writer/viewer credentials are documented as test fixtures.
- Writer-authenticated reset empties only its workspace when `TEST_MODE=true`.
- Target build and test environment are identified.

## Exit Criteria

- Lint and type-check complete without errors.
- All P0 and P1 automated tests pass in the supported primary browser.
- API and UI regression suites complete with reports.
- No open Critical or High genuine defect blocks a critical workflow.
- Any Medium/Low open defects and all verification limitations are documented.
- Requirements traceability, execution report, README, and actual reports agree.
- A repeat run shows no unexplained flaky failures.

Exit does not mean the application is defect-free. It means the agreed risk threshold and evidence requirements are satisfied.

## Suspension and Resumption Criteria

Testing pauses when the server cannot start, deterministic reset is unavailable, authentication is globally broken, or an environment issue invalidates most results. Testing resumes after the blocker is fixed and a health/login/reset smoke check passes. Unaffected checks may continue when their evidence remains valid.

## Risk Assessment

| Risk ID | Product/project risk                                                | Likelihood |   Impact | Priority | Mitigation                                                                                         |
| ------- | ------------------------------------------------------------------- | ---------: | -------: | -------- | -------------------------------------------------------------------------------------------------- |
| R-01    | Viewer can mutate tasks                                             |     Medium | Critical | P0       | API authorization matrix plus UI control checks.                                                   |
| R-02    | Cross-workspace task disclosure or mutation                         |     Medium | Critical | P0       | Workspace-bound token check, client-identity rejection, and planned direct foreign-resource cases. |
| R-03    | Invalid boundary data is accepted or corrupts state                 |     Medium |     High | P1       | BVA at API layer plus selected UI boundaries.                                                      |
| R-04    | Reset route is exposed outside test or without writer authorization |        Low | Critical | P0       | `TEST_MODE` gating, bearer authorization checks, and code review.                                  |
| R-05    | Tests pass because they depend on run order/shared workspace state  |     Medium |     High | P1       | Generate a unique empty workspace per test and create scenario-owned data.                         |
| R-06    | Search/filter returns misleading results                            |     Medium |   Medium | P1       | Scenario-created mixed data and combined-query assertions.                                         |
| R-07    | UI and API validation diverge                                       |     Medium |   Medium | P1       | Contract-based cases at both layers for representative rules.                                      |
| R-08    | Browser-specific UI regression                                      |        Low |   Medium | P2       | Cross-browser smoke and responsive manual charter.                                                 |
| R-09    | CI fails because readiness is race-prone                            |     Medium |     High | P1       | Health-based startup wait, never a fixed sleep.                                                    |
| R-10    | Portfolio overstates unexecuted evidence                            |        Low |     High | P0       | Statuses default to Planned; execution report generated only after runs.                           |

## Priority Definitions

| Priority | Meaning                                                                  | Expected treatment                     |
| -------- | ------------------------------------------------------------------------ | -------------------------------------- |
| P0       | Access-control, data-isolation, or test-safety failure; release blocker. | Run first; must pass for exit.         |
| P1       | Core login, CRUD, validation, search/filter, or CI reliability.          | Required regression coverage.          |
| P2       | Important compatibility, usability, and secondary negative behavior.     | Run after P0/P1; document limitations. |
| P3       | Low-risk presentation or enhancement behavior.                           | Execute when time permits.             |

## Defect Management

Genuine unexpected behavior is recorded in `BUG_REPORTS.md` with severity, priority, environment, reproducible steps, expected/actual behavior, evidence, and status. A failed test is not automatically a product defect: the tester first distinguishes application, test-code, data, and environment causes. Intentionally seeded behavior must be labeled as training behavior and is never reported as an unexpected production defect.

## Deliverables

- Requirements and traceability matrix.
- Test plan and strategy.
- Manual test cases and exploratory charters.
- Playwright API/UI suites and fixtures.
- HTML and JUnit reports with failure diagnostics.
- Defect log containing genuine findings only.
- Evidence-based execution report and CI artifacts.

## Roles and Responsibilities

The portfolio owner acts as test analyst and automation engineer: maintaining requirements, selecting coverage, implementing tests, triaging failures, documenting genuine defects, and keeping evidence current. The GitHub Actions workflow performed repeatable automated verification successfully in run 44394380121, but automation still does not replace human result review.

## Assumptions and Limitations

- TaskFlow QA is a training/portfolio application, not a production service.
- Demo credentials and scenario-created records contain no sensitive information.
- Data is intentionally in memory and is cleared by server start/restart.
- On the 2026-11-18 Windows run, Chromium UI passed 13/13, Chromium integration passed 1/1, the default 47-test regression passed twice (94/94 total), and WebKit UI passed 13/13. Firefox executed 0 tests because the Playwright Firefox process crashed before page access with `NS_ERROR_FAILURE` while attempting Windows registry access in the sandbox; this is an infrastructure limitation, not a product result.
- Final post-expansion formatting, lint, type-check, and build gates passed locally.
- The repository is public, and GitHub Actions run 44394380121 succeeded with all three jobs passing and three evidence artifacts uploaded.
- Performance and security claims are limited to the explicit checks in this plan.
