# Setup Guide

This guide starts TaskFlow QA locally and explains how to run each quality check. Commands are shown for PowerShell, but the npm commands are the same on macOS and Linux.

## Prerequisites

- Git
- Node.js 20 or later (an LTS release is recommended; CI is configured for Node.js 22)
- npm, supplied with Node.js
- Enough disk space for Playwright's browser binaries

No database, Docker container, cloud account, paid service, or secret is required.

Check the tools:

```powershell
node --version
npm --version
git --version
```

`package.json` requires Node.js `>=20`. Matching CI's Node.js 22 locally reduces environment differences.

## 1. Clone and enter the repository

Clone the public repository:

```powershell
git clone https://github.com/Mohamedatef27120/qa-engineering-portfolio.git
Set-Location qa-engineering-portfolio
```

For the current local copy, open a terminal in the project root—the directory containing `package.json` and `playwright.config.ts`.

## 2. Install dependencies

For a fresh clone with a committed lockfile:

```powershell
npm ci
```

`npm ci` installs the exact dependency versions recorded in `package-lock.json`. Use `npm install` only when intentionally updating dependencies and the lockfile.

Install the Playwright browser binaries required by the configured projects:

```powershell
npm run browsers:install
```

This script installs Chromium, Firefox, and WebKit into the repository-local `.playwright-browsers/` directory. That directory is intentionally ignored by Git because the binaries are generated dependencies, not source code. Every test script sets the same `PLAYWRIGHT_BROWSERS_PATH`, so installation and execution agree on the location.

The package also exposes `npm run browsers:install:ci` for installing all three engines plus Linux operating-system dependencies. The current GitHub workflow is more selective: each job installs only the browser it needs with `--with-deps`, while setting the same project-local `PLAYWRIGHT_BROWSERS_PATH`.

## 3. Start the application

For active development with automatic restart:

```powershell
npm run dev
```

This script enables test mode and uses `http://127.0.0.1:4180` so the application matches the Playwright setup.

For the normal non-watch server process:

```powershell
npm start
```

Keep that terminal open. The server prints the local address when it is ready. Open that address in a browser to use the task board.

The default port is `4180`. The data store is in memory, so restarting the server clears all tasks and login sessions.

### Test mode

The automated configuration starts the application with `TEST_MODE` enabled so the controlled reset route can be used. The route still requires a valid writer bearer token. The standard fixture resets its unique workspace to an empty task collection before and after the test. Do not enable test-only behavior for a public production deployment.

If you start a dedicated test server manually in PowerShell, environment-variable syntax looks like this:

```powershell
$env:TEST_MODE = 'true'
npm start
```

Close that terminal when finished. The variable assignment above applies only to that PowerShell process and its children.

## 4. Run static quality checks

Check formatting without rewriting files:

```powershell
npm run format:check
```

Lint the TypeScript and JavaScript source:

```powershell
npm run lint
```

Ask TypeScript to check types without emitting build output:

```powershell
npm run typecheck
```

Compile the server into `dist/`:

```powershell
npm run build
```

All four checks should complete before a change is considered ready for review.

## 5. Run automated tests

The scripts are separated so a failure can be investigated at the smallest useful layer.

| Command                      | Purpose                                                    |
| ---------------------------- | ---------------------------------------------------------- |
| `npm run test:api`           | Direct HTTP behavior, validation, CRUD, and access control |
| `npm run test:ui`            | User-visible browser workflows                             |
| `npm run test:ui:firefox`    | UI suite in Firefox                                        |
| `npm run test:ui:webkit`     | UI suite in WebKit                                         |
| `npm run test:integration`   | Scenarios that cross the API and browser boundaries        |
| `npm run test:regression`    | The normal complete regression selection                   |
| `npm run test:cross-browser` | Practical coverage across configured browser engines       |
| `npm test`                   | Project default test command as defined in `package.json`  |
| `npm run evidence:capture`   | Genuine dashboard and regression-report screenshots        |

Each test script delegates to `scripts/run-tests.mjs`. The runner starts the TypeScript application as a direct child process on port `4180` with `TEST_MODE=true`, waits for `GET /health`, starts Playwright, forwards its exit code, and stops the child processes in `finally`. Playwright's `webServer` option and `start-server-and-test` are not used. Run test commands from a clean terminal without a separately started app; a process already using port `4180` will block the runner.

To run a single spec while debugging:

```powershell
$env:PLAYWRIGHT_BROWSERS_PATH = '.playwright-browsers'
$env:REPORT_NAME = 'ui-focused'
node scripts/run-tests.mjs tests/ui/tasks.spec.ts --project=chromium
```

To run tests whose title contains a phrase:

```powershell
npm run test:regression -- --grep "viewer"
```

To see the browser during a UI run:

```powershell
npm run test:ui -- --headed
```

## 6. View reports and diagnostics

After a Playwright run, open the HTML report:

```powershell
npm run report
```

The package command opens `playwright-report/regression`. Other report folders include `api`, `ui-chromium`, `ui-firefox`, `ui-webkit`, `integration`, or `cross-browser`. The folders are set in `playwright.config.ts` and ignored by Git. Failed browser tests may include a screenshot, video, and Playwright trace.

Open a retained trace with:

```powershell
npx playwright show-trace <path-to-trace.zip>
```

The trace viewer shows actions, page snapshots, console messages, requests, and assertion timing. It is usually more useful than adding log statements blindly.

## 7. Recommended local verification order

Run the same gates a reviewer expects:

```powershell
npm ci
npm run browsers:install
npm run format:check
npm run lint
npm run typecheck
npm run build
npm run test:api
npm run test:ui
npm run test:integration
npm run test:regression
npm run test:ui:webkit
npm run test:ui:firefox
npm run evidence:capture
```

`npm run test:cross-browser` runs Chromium, Firefox, and WebKit together. The individual engine scripts are better for diagnosing or reporting a browser-specific outcome. A browser launch failure means the composite command is blocked/failed even if the other engines pass; report each engine separately.

Run `npm run evidence:capture` only after a successful regression has produced `playwright-report/regression`. It starts the real application and report viewer, then replaces the two portfolio screenshots in `screenshots/` with newly captured evidence.

Do not copy a successful result into the execution report until the command actually ran in the named environment. Record failures and blocked checks honestly.

## Common problems

### The application port is already in use

Stop the old server process or configure a different supported port/base URL. Do not start multiple application processes against the same expected test port.

### A browser executable is missing

Run:

```powershell
npm run browsers:install
```

### Tests see unexpected data

Confirm that the test sends its generated `X-Workspace-Id` everywhere, including API setup and the browser session. Restarting the server clears the in-memory store, but isolation should not require a restart between ordinary tests.

### A viewer can change data

Check both layers: the browser should hide or disable unsupported controls, and the API must still reject the mutation. UI-only restrictions are not authorization.

### An assertion times out

Read the error's locator and expected value, then inspect the trace. Prefer waiting for a meaningful UI or API state through Playwright assertions. Do not add an arbitrary `waitForTimeout` to hide a race.

### `npm ci` says the lockfile is inconsistent

This means `package.json` and `package-lock.json` do not agree. A maintainer should intentionally run `npm install`, review the lockfile change, repeat all checks, and commit both files together.

## GitHub Actions status

The public repository's [GitHub Actions run 44394380121](https://github.com/Mohamedatef27120/qa-engineering-portfolio/actions/runs/44394380121) completed successfully. Its quality-gates/Chromium, Firefox, and WebKit jobs passed on GitHub-hosted Ubuntu, and three evidence artifacts were uploaded.

## Verified local results — 2026-11-18

| Check                                               | Result                                                                                    |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Static gates: format check, lint, type check, build | Passed                                                                                    |
| `npm run test:api`                                  | 33/33 passed                                                                              |
| `npm run test:ui` (Chromium)                        | 13/13 passed                                                                              |
| `npm run test:integration` (Chromium)               | 1/1 passed                                                                                |
| `npm run test:regression`                           | 47/47 passed on two consecutive runs                                                      |
| `npm run test:ui:webkit`                            | 13/13 passed                                                                              |
| `npm run test:ui:firefox`                           | 0 tests executed; browser launch blocked by this Windows sandbox's registry-access denial |
| `npm run evidence:capture`                          | Genuine `taskflow-dashboard.png` and `regression-report.png` captured                     |

Do not describe the local Firefox run as a product failure or a local pass: no Firefox test reached the application in the Windows sandbox. The API, Chromium, integration, repeated regression, WebKit, and screenshot results are genuine local evidence. Firefox later passed on GitHub-hosted Ubuntu, and the public repository's first workflow run succeeded.
