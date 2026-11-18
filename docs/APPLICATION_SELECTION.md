# Application Selection Record

## Decision

**Selected application:** TaskFlow QA, a purpose-built, locally hosted task-management application.

**Decision date:** 2026-11-18

The application is intentionally small enough for an entry-level engineer to understand, but it includes realistic business rules: authentication, two permission levels, task CRUD, validation boundaries, search, filtering, workspace isolation, and workspace-scoped test-data reset. This keeps the portfolio focused on QA engineering rather than on maintaining an unrelated product.

## Candidates Considered

Scores use a 1–5 scale, where 5 is strongest for this portfolio's goals.

| Criterion                       | Hosted SauceDemo | Local RealWorld/Conduit | Purpose-built TaskFlow QA |
| ------------------------------- | ---------------: | ----------------------: | ------------------------: |
| Stability and accessibility     |                4 |                       4 |                         5 |
| Permission to automate          |                5 |                       5 |                         5 |
| UI testing opportunities        |                4 |                       5 |                         4 |
| API testing opportunities       |                1 |                       5 |                         5 |
| Business workflow complexity    |                3 |                       5 |                         4 |
| Test-data control               |                2 |                       4 |                         5 |
| Reproducible state and defects  |                3 |                       4 |                         5 |
| CI/CD suitability               |                3 |                       4 |                         5 |
| Long-term portfolio reliability |                3 |                       4 |                         5 |
| Interview demonstration value   |                3 |                       5 |                         5 |
| **Total / 50**                  |           **31** |                  **45** |                    **48** |

### Candidate 1: Hosted SauceDemo

SauceDemo is an official Sauce Labs sample application. Its source is public under the MIT license, and Sauce Labs publishes automation examples that exercise the site. It offers useful UI workflows such as login, inventory, cart, sorting, and checkout.

It was not selected because it has no meaningful product REST API for the required API test portfolio, its fixed/shared data limits test-data design, and CI would depend on an external hosted service. It is also very common in beginner portfolios, reducing differentiation.

Sources:

- [Sauce Labs sample application repository](https://github.com/saucelabs/sample-app-web)
- [Sauce Labs demonstration automation scripts](https://docs.saucelabs.com/web-apps/automated-testing/selenium/sample-scripts/)

### Candidate 2: Local RealWorld/Conduit

RealWorld provides a realistic publishing application contract with authentication, profiles, articles, comments, tags, feeds, and CRUD operations. It has a documented API specification, contract tests, multiple frontend/backend implementations, and an open-source backend that can run locally.

It was not selected because RealWorld is an ecosystem of independently maintained implementations rather than one small canonical full-stack product. Pinning and maintaining compatible frontend and backend implementations would add setup and dependency work that is not central to the QA portfolio. Its public API also has usage and data-visibility restrictions, so reliable automation would require running more infrastructure locally.

Sources:

- [RealWorld project repository](https://github.com/realworld-apps/realworld)
- [RealWorld API options and public API limitations](https://docs.realworld.show/specifications/frontend/api/)
- [RealWorld backend and contract-test specification](https://docs.realworld.show/specifications/backend/introduction/)

### Candidate 3: Purpose-built TaskFlow QA

TaskFlow QA provides exactly the surfaces needed for credible UI and API testing while remaining deterministic and understandable:

- local Express/TypeScript server;
- browser UI and REST API over the same business rules;
- demo `writer` and `viewer` roles;
- task create, read, update, and delete workflows;
- title and description boundaries;
- enumerated priority and status values;
- optional due-date validation;
- search and filtering;
- bearer sessions bound to the `X-Workspace-Id` chosen at login, with cross-workspace reuse rejected;
- workspace data isolation and rejection of client-controlled identity fields;
- `POST /api/test-support/reset`, available only when `TEST_MODE=true`, which requires writer bearer authentication and empties that writer's workspace.

## Why TaskFlow QA Was Selected

TaskFlow QA has the best balance of testability, reproducibility, maintainability, and interview value. Every automated test can use a unique empty workspace or explicitly reset its writer workspace, CI requires no paid or shared service, and the UI/API behavior can be traced to version-controlled requirements. Data is held in memory, so starting or restarting the server clears all workspaces.

The main limitation is that the application and tests are developed in the same repository. This is documented honestly. The risk is reduced by defining requirements independently, testing only public UI/API behavior, separating application code from test code, and never claiming unexecuted or simulated results as evidence.

## Decision Constraints

- The application is a portfolio test target, not a production multi-tenant service.
- Credentials are demo-only and contain no secrets.
- Data persistence is designed for repeatable local and CI test runs, not production durability.
- The test reset capability must be unavailable unless `TEST_MODE=true`, must require writer bearer authentication, and must affect only the authenticated writer's workspace.
- Server restart is destructive by design because version 1 stores data in memory; production durability is outside scope.
- Any deliberately seeded training defect must be labeled as intentional. No such defect is assumed in this baseline.

## Post-selection Verification Snapshot

The selection was validated locally on Windows on 2026-11-18: API tests passed 33/33; Chromium UI passed 13/13; Chromium integration passed 1/1; the default 47-test regression passed twice (94/94 total repeatability evidence); and WebKit UI passed 13/13. Firefox executed 0 tests because its process crashed before page access in the sandbox with `NS_ERROR_FAILURE` on Windows registry access. Final post-expansion formatting, lint, type-check, and build gates all passed locally. The repository is unpublished and GitHub Actions has not run, so no CI result is claimed.
