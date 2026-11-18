# Test Execution Report

## Execution Summary

| Field                 | Value                                |
| --------------------- | ------------------------------------ |
| Project               | TaskFlow QA Engineering Portfolio    |
| Execution date        | 18 November 2026                     |
| Execution type        | Local automated verification         |
| Operating environment | Windows, Codex managed workspace     |
| Node.js / npm         | 24.21.0 / 12.2.3                     |
| Playwright Test       | 1.65.1                               |
| Application           | Express 5.3.0, TypeScript 5.9.3      |
| Application URL       | `http://127.0.0.1:4180`              |
| Data model            | In-memory, unique workspace per test |

## Honest Status Definitions

- **Passed:** the command completed with exit code 0 and its assertions passed.
- **Failed:** an application assertion was reached and did not match expected behavior.
- **Blocked:** the intended test could not reach the application because of an environmental prerequisite.
- **Not executed:** no actual execution evidence exists.

Manual test cases and exploratory charters remain **Not executed / Planned**. This report does not convert them to passed based on automation.

## Final Results

| Command / check             | Scope                                  | Actual result                        |
| --------------------------- | -------------------------------------- | ------------------------------------ |
| `npm run format:check`      | Repository formatting                  | Passed                               |
| `npm run lint`              | Application, framework, tests, scripts | Passed                               |
| `npm run typecheck`         | Strict TypeScript validation           | Passed                               |
| `npm run build`             | Production compilation                 | Passed                               |
| Production start smoke      | Compiled server and `/health`          | Passed                               |
| `npm run test:api`          | 33 API tests                           | 33 passed                            |
| `npm run test:ui`           | 13 Chromium UI tests                   | 13 passed                            |
| `npm run test:integration`  | API → UI → API lifecycle               | 1 passed                             |
| `npm run test:regression`   | API + Chromium + integration           | 47 passed                            |
| Immediate regression repeat | Same 47-test baseline                  | 47 passed                            |
| `npm run test:ui:webkit`    | 13 WebKit UI tests                     | 13 passed                            |
| Firefox launch probe        | One Firefox scenario                   | Blocked before test execution        |
| `npm audit`                 | Dependency vulnerability audit         | Passed; 0 vulnerabilities            |
| GitHub Actions              | Hosted CI                              | Not executed; repository unpublished |

The API, UI, and integration commands overlap with the regression suite. The project therefore has **47 unique baseline tests**, not a sum of every repeated command.

## Repeatability Check

The final 47-test regression ran twice back to back with the same code and passed both times: **94/94 repeat executions**. No retry was needed locally because local retries are set to zero. This is evidence against obvious order dependency or immediate flakiness; it is not a long-term statistical flake study.

## Browser Coverage

| Browser engine | Version observed                | Result                           |
| -------------- | ------------------------------- | -------------------------------- |
| Chromium       | Chrome for Testing 159.0.8154.6 | 13/13 UI tests passed            |
| WebKit         | Playwright WebKit 27.2          | 13/13 UI tests passed            |
| Firefox        | Playwright Firefox 159.0        | 0 tests executed; launch blocked |

Firefox exited during browser startup with `NS_ERROR_FAILURE` while attempting Windows registry access inside the managed sandbox. A serialized one-test probe produced the same result. No Firefox test reached TaskFlow QA, so this is an infrastructure blocker rather than a product failure. The GitHub Actions workflow retains a Firefox job on Ubuntu, but that job is unverified until publication.

## Coverage Executed

The successful automated runs exercised:

- health, login validation, bearer authentication, logout invalidation, and role authorization;
- viewer create/update/delete denial with unchanged-state verification;
- session-bound workspace isolation and client-controlled ownership rejection;
- GET, POST, PATCH, and DELETE task operations;
- title 1/80/81 boundaries and description 500/501 boundaries;
- invalid priority, status, due date, query, ID, and request shapes;
- atomic rejection of a mixed valid/invalid update;
- case-insensitive title/description search and combined filters;
- UI create, refresh, edit, delete cancel/confirm, and form feedback;
- viewer read-only UI, real sign-out, and a 375px responsive smoke check;
- an API-created task completed in the UI and verified through the API.

The detailed requirement mapping is in [Requirements Traceability](REQUIREMENTS_TRACEABILITY.md).

## Evidence

- HTML reports: generated under `playwright-report/<run-name>/` and ignored from Git because they are reproducible.
- JUnit: generated under `test-results/<run-name>.xml` and ignored from Git.
- Failure diagnostics: configured for screenshots, video, and traces under run-specific folders.
- Tracked genuine screenshots:
  - [`screenshots/regression-report.png`](../screenshots/regression-report.png)
  - [`screenshots/taskflow-dashboard.png`](../screenshots/taskflow-dashboard.png)
- Evidence recreation: `npm run evidence:capture`.

## Defect Outcome

No genuine product defect remained in the final executed automation. During development, verification exposed test/configuration issues—including an ambiguous viewer locator, browser cache location, stale-server reuse, and Windows process shutdown behavior. These were framework/environment findings and were corrected before the recorded green runs.

The unresolved Firefox launch problem is listed as an infrastructure blocker in [Bug Reports](BUG_REPORTS.md), not as an application defect.

## Exit Criteria Review

| Exit criterion                                    | Status                                                 |
| ------------------------------------------------- | ------------------------------------------------------ |
| App starts and health check responds              | Met locally                                            |
| Formatting, lint, type-check, and build pass      | Met locally                                            |
| API, Chromium UI, and integration regression pass | Met locally                                            |
| HTML and JUnit reports generate                   | Met locally                                            |
| Immediate repeat run passes                       | Met locally                                            |
| Cross-browser coverage attempted                  | Partially met: Chromium/WebKit passed, Firefox blocked |
| Manual/exploratory execution complete             | Not met; intentionally remains planned                 |
| GitHub Actions verified                           | Not met; publication approval/authentication pending   |
| No sensitive secrets committed                    | Met by local review; recheck before publication        |

## Sign-off

The project is ready for local portfolio review and for a publication approval decision. It is not yet valid to claim a green GitHub Actions build or full three-engine local execution.
