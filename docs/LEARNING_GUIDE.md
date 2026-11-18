# Learning Guide

## What this project teaches

TaskFlow QA is both a small task-management product and an evidence-based QA portfolio. It shows the path from a business requirement to manual test design, automated checks, diagnostics, and CI configuration.

The goal is not to claim that a small app represents every production challenge. The goal is to make each quality decision visible enough that you can explain it in an interview.

## Why this application was selected

A task board provides realistic business behavior—create, read, update, delete, validation, roles, status changes, and data isolation—without requiring a paid account or sending automation traffic to someone else's public demo service.

Running the application locally gives the project:

- controlled, reproducible data;
- a stable UI and API contract;
- permission to automate every included workflow;
- safe negative and boundary testing;
- an environment that CI can start from a clean state.

The tradeoff is that this repository owns both the app and its tests. A real QA engineer should still test through public behavior and avoid making tests pass by importing private server logic.

## How the repository is organized

| Path                                       | What to study                                                                                 |
| ------------------------------------------ | --------------------------------------------------------------------------------------------- |
| `README.md`                                | Recruiter-facing summary, commands, coverage, limits, and verified evidence                   |
| `app/src/server.ts`                        | Express routes, demo login, bearer-token checks, role checks, static hosting, and safe errors |
| `app/src/store.ts`                         | In-memory CRUD partitioned by `X-Workspace-Id`                                                |
| `app/src/validation.ts`                    | Title, description, priority, status, due-date, and update validation                         |
| `app/src/types.ts`                         | Application-domain TypeScript types                                                           |
| `app/public/index.html`                    | Accessible login, task form, filters, dialogs, and task-list markup                           |
| `app/public/app.js`                        | Login state, API calls, task rendering, filters, edit, and delete behavior                    |
| `app/public/styles.css`                    | Responsive layout and visible focus/status styling                                            |
| `pages/LoginPage.ts`                       | Login-form locators and sign-in action                                                        |
| `pages/TasksPage.ts`                       | Task-board locators and create/edit/delete/filter actions                                     |
| `tests/api/auth.spec.ts`                   | Health, login validation, workspace-bound tokens, logout, roles, and reset authorization      |
| `tests/api/tasks.spec.ts`                  | CRUD, boundary, validation, missing-ID, and filtering checks                                  |
| `tests/ui/auth.spec.ts`                    | Sign-in, invalid login, logout, and viewer read-only experience                               |
| `tests/ui/tasks.spec.ts`                   | Browser task CRUD, validation, refresh, search, and filtering workflows                       |
| `tests/integration/task-lifecycle.spec.ts` | API create → UI update → API verification lifecycle                                           |
| `tests/fixtures/test.ts`                   | Test-scoped workspace, API client, authenticated page, and Page Object setup                  |
| `tests/support/api-client.ts`              | Login-aware API wrapper that sends the workspace and bearer token                             |
| `test-data/users.ts`                       | Clearly documented local demo users and invalid-login data                                    |
| `test-data/tasks.ts`                       | Task types, unique titles, and a valid-payload builder                                        |
| `playwright.config.ts`                     | Projects, base URL, retries, timeouts, reporters, and failure evidence                        |
| `package.json`                             | Dependencies and the commands you run                                                         |
| `scripts/run-tests.mjs`                    | Direct child-process server lifecycle around every Playwright command                         |
| `scripts/capture-evidence.mjs`             | Reproducible capture of genuine dashboard and regression-report screenshots                   |
| `.gitignore`                               | Excludes generated dependencies/reports, including `.playwright-browsers/`                    |
| `tsconfig.json`                            | TypeScript checking rules                                                                     |
| ESLint/Prettier configuration              | Consistent code-quality and formatting rules                                                  |
| `.github/workflows/`                       | The hosted CI quality gates prepared for publication                                          |
| `docs/TEST_PLAN.md`                        | Scope, risks, entry criteria, and exit criteria                                               |
| `docs/TEST_STRATEGY.md`                    | What belongs at each test layer and why                                                       |
| `docs/TEST_CASES.md`                       | Manual cases with data, expected results, status, and automation mapping                      |
| `docs/REQUIREMENTS_TRACEABILITY.md`        | Links requirements to cases and automated evidence                                            |
| `docs/BUG_REPORTS.md`                      | Genuine or clearly labeled training defects only                                              |
| `docs/TEST_EXECUTION_REPORT.md`            | Facts recorded from commands that were actually executed                                      |

Read the project in this order: README, requirements/strategy, one API test, one UI test plus its Page Object, fixtures, Playwright configuration, then the server code. That order keeps the business behavior ahead of implementation details.

## How Playwright works here

Playwright Test supplies three related pieces:

1. a test runner that discovers specs and reports results;
2. browser automation for Chromium and the other configured engines;
3. `APIRequestContext`, an HTTP client designed for test setup and API assertions.

The `npm run browsers:install` command stores Chromium, Firefox, and WebKit under the ignored `.playwright-browsers/` directory. All test scripts set `PLAYWRIGHT_BROWSERS_PATH` to that same directory. This keeps setup repeatable inside the project instead of depending on a machine-global browser cache.

### How the test server lifecycle works

The Playwright configuration does not use its `webServer` feature. Each npm test command calls `scripts/run-tests.mjs`, which:

1. starts `app/src/server.ts` as a direct Node child process on port `4180` with `TEST_MODE=true`;
2. polls `http://127.0.0.1:4180/health` for at most 30 seconds;
3. starts Playwright with the requested spec path and project;
4. forwards the Playwright exit code; and
5. stops the test and server processes in `finally`, including Windows process-tree cleanup when required.

This makes server ownership explicit and prevents a successful test command from leaving a hidden server running. It also means you should not manually start the app before an npm test command.

A simplified test looks like this:

```ts
test('writer creates a task', async ({ page }) => {
  await page.getByLabel('Title').fill('Review release notes');
  await page.getByRole('button', { name: 'Add task' }).click();
  await expect(page.getByText('Review release notes')).toBeVisible();
});
```

`await` matters because browser and network operations are asynchronous. The `expect` assertion waits for the visible result up to the configured timeout; a fixed sleep would wait either too long or not long enough.

## How UI tests are designed

UI automation is valuable when a risk depends on the rendered interface or complete user workflow. It is slower and more sensitive to layout/locator changes than direct API testing, so the suite uses it selectively.

### Reliable locators

Prefer locators in this order:

1. roles and accessible names, such as a button named `Add task`;
2. labels associated with form fields;
3. stable visible text when it is part of the requirement;
4. explicit test IDs for elements without a reliable semantic locator.

Avoid long CSS paths such as `div:nth-child(3) > button`. They describe the current layout rather than user meaning.

### Independent scenarios

An independent test creates its own preconditions, performs one coherent workflow, and checks its own outcome. It never says “run the create test before this edit test.” Playwright may change order, retry a failure, or run workers in parallel.

The unique `X-Workspace-Id` makes that independence practical. The same workspace must be used by any API setup and by the browser for that one scenario. A bearer token is bound to the workspace used at login, so changing only the header cannot reuse that session in another workspace. The logout endpoint deletes the token from the in-memory session map.

## Page Object Model (POM)

A Page Object is a small class that knows how to interact with a page or meaningful component.

```ts
class TasksPage {
  constructor(private readonly page: Page) {}

  async createTask(input: { title: string }) {
    await this.page.getByLabel('Title').fill(input.title);
    await this.page.getByRole('button', { name: /create task|add task/i }).click();
  }
}
```

The test remains responsible for the scenario and expected result:

```ts
await tasksPage.createTask({ title: 'Review release notes' });
await expect(tasksPage.taskCard('Review release notes')).toBeVisible();
```

Why this helps: if a label changes, one Page Object may need updating instead of many tests. Why it can hurt: a giant Page Object with hidden assertions and many layers makes tests harder to understand. This project uses POM where interactions repeat and keeps business assertions visible.

## Fixtures

A fixture prepares a resource for a test and, when necessary, cleans it afterward. Playwright's built-in `page` is a fixture. This project adds project-specific setup such as a unique workspace and configured request/page context.

Conceptually:

```ts
workspaceId = unique value for this test
api client   = sends X-Workspace-Id: workspaceId
browser page = uses the same workspaceId
```

Fixtures are test-scoped so parallel workers do not share mutable state. The API fixture logs in as the writer, calls the `TEST_MODE`-guarded and writer-protected reset route, and resets its unique workspace to empty before and after use. A good fixture makes a prerequisite easy to request while keeping the test's important behavior obvious.

## Assertions

Assertions compare the observed result with the expected result. Good assertions are specific:

```ts
expect(response.status()).toBe(201);
await expect(page.getByRole('alert')).toContainText('Title is required');
```

The first checks the HTTP contract. The second checks user-visible behavior and automatically retries while the page changes.

Avoid assertions that only prove an action did not throw. For a create operation, verify the status, important response fields, and/or observable stored state in the current server process.

## How API tests work

API tests use `APIRequestContext` to send HTTP requests without opening a browser. `TaskApiClient` logs in once, remembers the returned bearer token, and adds both authorization and workspace headers:

```ts
const response = await apiClient.createTask(validTask({ title: 'Review release notes' }));

expect(response.status()).toBe(201);
const { data } = await response.json();
expect(data.title).toBe('Review release notes');
```

The suite should cover success and failure behavior:

- valid CRUD requests;
- required-field validation;
- invalid identifiers;
- boundary values such as the maximum accepted title length;
- writer versus viewer permissions;
- error response shape.

An API test should not claim an endpoint or field the application does not implement. Traceability documents map only actual requirements to actual checks.

## Integration tests

An integration check asks whether two real parts work together. For example, it can create a task through the API, then confirm that the browser renders it in the matching workspace.

This is not duplication. The API test proves the endpoint contract; the integration test proves the UI actually consumes that contract and shares the same data boundary.

## Test data management

Reusable builders should start from a valid object and let the caller override only relevant values:

```ts
const task = validTask({ title: '' }); // invalid required-field case
```

Principles used here:

- names explain why the data exists;
- generated IDs/workspaces avoid collisions;
- boundary values are explicit, not mysterious strings;
- secrets and personal data are never committed;
- tests create only the records they need;
- restart/reset behavior is documented honestly.

## Debugging a failed test

Use this order:

1. Read the first useful assertion error, expected value, and actual value.
2. Re-run the smallest failing spec or use `--grep` for one title.
3. Open the Playwright trace and inspect actions, network calls, console errors, and page snapshots.
4. Decide whether the product, test data, locator, environment, or expectation is wrong.
5. Reproduce through the UI or a direct request when useful.
6. Fix the cause, then run both the focused check and the relevant regression suite.

Do not immediately increase a timeout. A timeout may reveal a real application error, a missing precondition, or a locator that can never match.

## How GitHub Actions works

GitHub Actions starts a clean hosted runner after configured repository events, then executes the workflow steps. For this project, the intended flow is:

```text
checkout -> Node setup/cache -> npm ci -> required browser in .playwright-browsers
         -> lint/typecheck -> start app/test suites -> upload artifacts
```

The runner has no local uncommitted files and no previous in-memory data. That makes CI useful for finding hidden machine assumptions.

The workflow exists locally, but it is not evidence of a successful hosted pipeline until the repository is published and a real run completes. Do not add a passing badge before its URL and status are valid.

## What was actually verified locally

On 2026-11-18, formatting, linting, type checking, and the TypeScript build passed. The API project passed 33/33 tests, Chromium UI passed 13/13, Chromium integration passed 1/1, and the combined regression passed 47/47 on two consecutive runs. WebKit UI passed 13/13.

Firefox executed 0 tests in this Windows sandbox. Browser launch was blocked by a registry-access denial imposed by the environment. That is different from a failed product assertion: the Firefox result is **blocked**, and the full cross-browser command is not reported as green. A normal local machine or GitHub runner still needs to execute the Firefox project.

After the passing regression, `npm run evidence:capture` started the real application, created a visible task through the UI, served the actual regression report, and captured `screenshots/taskflow-dashboard.png` and `screenshots/regression-report.png`. These are genuine screenshots, not mockups. GitHub-hosted CI and repository publication remain unverified.

## How to add a new test

1. Start with a requirement or risk, not a desire to increase the test count.
2. Decide the cheapest reliable layer: API for HTTP contract, UI for user experience, integration for a boundary.
3. Add or reuse explicit test data.
4. Use the isolated workspace fixture.
5. Write an action-focused title such as `viewer cannot delete a task`.
6. Arrange only required preconditions.
7. Perform the behavior through the public interface.
8. Assert the important result and, for failures, the error contract/message.
9. Run the focused test, its suite, lint, and typecheck.
10. Update the manual case and traceability row when coverage changes.

If the UI interaction repeats, add a focused Page Object method. Do not create an abstraction for a one-line operation unless it improves clarity.

## Maintaining the project

- Review dependency updates intentionally and commit the lockfile.
- Treat flaky tests as defects; do not normalize repeated reruns.
- Keep requirements, cases, automation, and execution reports aligned.
- Record only results from commands that actually ran.
- Preserve accessible locators when changing the UI.
- Revisit risks when adding features or changing roles.
- Keep test-only endpoints guarded by `TEST_MODE`.
- Never commit reports containing secrets or unexpected personal data.
- After publication, confirm GitHub Actions on the default branch and only then add a valid status badge.

## Honest project boundaries

- Data resets whenever the server restarts.
- Bearer-token sessions are also in memory and become invalid after restart.
- Identity and roles are simplified for local deterministic testing.
- The application and QA framework share a repository.
- No database, mobile app, load test, or production monitoring is claimed.
- GitHub publication and hosted CI remain unverified until they actually occur.

Knowing these boundaries is a strength in an interview. It shows you can distinguish a purposeful portfolio design from production architecture.
