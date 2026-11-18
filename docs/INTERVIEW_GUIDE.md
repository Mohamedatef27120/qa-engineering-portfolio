# Interview Guide

Use these answers as a structure, not a script to memorize word for word. Replace the execution-status sentence with the latest facts from `TEST_EXECUTION_REPORT.md` before an interview.

## 30-second introduction

> TaskFlow QA is a production-style testing portfolio around a small local task-management application. I designed manual coverage and Playwright automation for its API, UI, and API-to-UI integration. Tests use isolated workspaces, and the local regression passed 47/47 twice. API passed 33/33, Chromium UI 13/13, integration 1/1, and WebKit UI 13/13. Firefox executed zero tests because this Windows sandbox blocked browser launch, and GitHub CI is not yet verified.

## Two-minute walkthrough

> I first compared possible applications under test. A controlled local app was the strongest fit because public demos may be unstable or may not permit unrestricted automation. TaskFlow gives me meaningful CRUD, validation, boundary, role, and end-to-end risks without external accounts.
>
> The Express application serves both a static browser UI and a task API on port 4180. Task data and bearer-token sessions are in memory, so both disappear on restart. A token is bound to the workspace used at login, and logout invalidates it. Every automated test gets a unique `X-Workspace-Id`, which keeps records separate and allows safe parallel execution.
>
> I split coverage by risk and speed. API tests cover the detailed HTTP contract and negative combinations. UI tests cover the most valuable user workflows. Integration tests create or inspect data across both interfaces. Repeated UI interactions are in a Page Object, while expected results stay visible in the specs. Playwright produces HTML and JUnit output and retains failure evidence according to configuration.
>
> The repository also shows the manual side of QA: scope, risks, equivalence partitions, boundaries, exploratory charters, severity/priority, cases, and requirements traceability. Results are only marked executed when they really ran. The dashboard and 47-test report screenshots were captured from the real app and report. Firefox is recorded as launch-blocked, not misreported as a product failure or pass. The GitHub workflow is prepared, but I would not call CI verified until the repository is published and a real Actions run completes.

## Five-minute technical explanation

### 1. Product and risks

TaskFlow's main behaviors are task CRUD, validation, state changes, workspace separation, and role-based permissions. The highest risks are unauthorized modification, data leaking between workspaces, invalid task data being accepted, and the UI disagreeing with the API.

### 2. Test design

I used equivalence partitioning for categories such as valid/blank/too-long titles and writer/viewer roles. I used boundary value analysis around defined length limits. Positive checks prove valid workflows; negative checks prove the error status and message and confirm state was not changed.

I selected the lowest reliable automation layer. Detailed payload validation belongs mainly at API level. A user creating and seeing a task belongs at UI level. Creating through the API and seeing the record in the browser belongs at integration level.

### 3. Automation architecture

The tests are TypeScript Playwright specs. The Page Object owns task-board locators and common actions, not business expectations. Fixtures generate a unique workspace and configure requests/browser state consistently. Test data builders provide valid defaults with explicit overrides for the one condition being tested. Each npm test command uses `scripts/run-tests.mjs` to start the application as a direct child, wait for health on port `4180`, run Playwright, forward its result, and stop the processes. The project does not rely on Playwright's `webServer` option.

Playwright auto-waiting and web-first assertions remove the need for fixed sleeps. A failure can preserve a screenshot and trace, and reporters generate human-readable HTML plus machine-readable JUnit output.

### 4. Isolation and repeatability

Every test sends `X-Workspace-Id`. The in-memory store partitions records by workspace, so parallel workers do not delete or edit each other's tasks. A token is bound to its login workspace, so changing the header cannot cross that boundary, and logout removes the token. Tests create their own preconditions and never depend on execution order. The reset route requires `TEST_MODE`, authentication, and the writer role; the fixture uses it to empty only its generated workspace before and after a test.

### 5. CI and honest evidence

The workflow is designed to run dependency installation, project-local browser installation, lint, type checking, the application, and test suites in a clean environment, then upload reports and traces. Locally prepared workflow code is not the same as a successful GitHub run, so the README and execution report must distinguish local verification from hosted CI verification.

### 6. Limits and next steps

The data store is not persistent, roles are simplified, and app/test code share a repository. The most useful next improvements would be a real test database with migration/reset strategy, real authentication/authorization, and verified GitHub CI with trend or accessibility evidence. I would add those only with matching requirements and maintainable tests.

## Common junior QA questions

### What is the difference between verification and validation?

Verification asks whether we built the product according to its specification—for example, whether an over-limit title returns the documented error. Validation asks whether we built the right experience for the user—for example, whether a user can understand and recover from that error.

### What is regression testing?

Regression testing checks that existing behavior still works after a change. In this project, the regression command combines the stable checks selected to protect core task, validation, and access-control workflows.

### What are severity and priority?

Severity is the effect of a defect on the product. Priority is how urgently the team should address it. A small typo on a launch page may be low severity but high priority; a rare data problem may be high severity but scheduled after the team understands its reach.

### How did you use equivalence partitioning?

I grouped inputs expected to behave the same, such as acceptable titles, blank titles, and titles above the limit. I selected representative values from each group rather than testing every possible string.

### How did you use boundary value analysis?

For a field with a maximum length, I test values immediately below, at, and immediately above the boundary. Errors often occur at transitions because of `>` versus `>=` mistakes.

### When should a test be manual?

Exploratory learning, subjective usability, rapidly changing behavior, and a one-time low-risk check may be better manual work. Stable, repeated, deterministic, high-value regression checks are better automation candidates.

### What makes a good bug report?

It has a precise title, environment, reproducible preconditions and steps, expected versus actual behavior, severity/priority, evidence, and current status. I do not label an intentionally seeded training defect as an unexpected production discovery.

## Automation architecture questions

### Why Playwright?

It supports browser automation, API requests, parallel execution, traces, screenshots, and multiple browser engines in one TypeScript test runner. That keeps the portfolio focused without combining several overlapping frameworks.

### Why use a Page Object?

The task board has interactions that repeat across scenarios. Centralizing their locators and mechanics reduces maintenance. I keep scenario assertions in the spec so the expected behavior remains easy to review.

### Why not put every action in a helper?

Too many layers hide what the test does and make debugging harder. I abstract repeated or complex mechanics; I keep simple, scenario-specific actions close to the test.

### How do tests run in parallel safely?

Each test uses a unique `X-Workspace-Id`, and the store partitions tasks by that value. Tests also create their own records and do not rely on order. This prevents one worker's cleanup or update from changing another worker's scenario.

### How do you avoid flaky waits?

I use Playwright locators and web-first assertions that retry meaningful conditions. I avoid `waitForTimeout`. If timing fails, I inspect the trace and fix the missing synchronization or product behavior.

### What would you do with a flaky test in CI?

I would capture the trace and environment, reproduce the smallest case, classify whether the cause is product, test, data, or environment, and fix the cause. A retry can collect evidence for a suspected intermittent issue, but it is not proof that the suite is healthy.

## API testing questions

### What do you assert in an API test?

I assert the status code, important headers when required, response schema/fields, business values, and stored state within the current server process where relevant. For a rejected update, I also confirm the original in-memory task was not changed.

### How do you test authorization?

I compare the same operation under writer and viewer roles. I verify allowed reads and rejected mutations at the API boundary. Hiding a delete button is useful UI behavior, but the server must still reject a viewer's direct DELETE request.

### What negative cases matter most?

Missing required fields, blank values, over-boundary values, invalid enum values, malformed or unknown IDs, unauthorized mutations, and attempts to affect another workspace. The exact set must match implemented requirements.

### Why use API setup for some UI tests?

Creating a precondition through the API is faster and more precise than repeating unrelated UI steps. The scenario still exercises the user behavior under test. I keep at least one full user creation workflow to cover the UI path itself.

## CI/CD questions

### What happens in your pipeline?

The prepared workflow checks out a clean repository, configures Node dependency caching, installs locked dependencies and Playwright requirements, runs lint and type checks, executes the configured test suites, and uploads reports and failure diagnostics. A required failure should fail the job.

### Is your CI currently passing?

Use the fact that is true on interview day. Before publication, the honest answer is:

> The workflow is implemented and locally reviewable, but it is not yet verified on GitHub because public publication and an Actions run have not occurred. I keep that limitation visible rather than displaying an unverified badge.

After a real run, cite the exact branch, commit, and outcome from the repository.

### Did cross-browser testing pass?

> Chromium UI passed 13/13 and WebKit UI passed 13/13 locally. Firefox executed 0 tests because the Windows sandbox denied registry access during browser launch. I therefore do not call the combined cross-browser run green, and I do not classify that launch blocker as a product defect. Firefox still needs verification on a normal machine or GitHub runner.

### Why use `npm ci` instead of `npm install` in CI?

`npm ci` requires the lockfile to match `package.json` and installs the recorded versions without rewriting dependency metadata. That makes CI setup more reproducible.

## Manual testing questions

### How did risk affect coverage?

Access control and workspace separation receive high priority because failures could expose or corrupt data. Core CRUD and validation receive broad regression coverage. Cosmetic behavior is reviewed but does not displace higher-impact risks.

### What is an exploratory charter?

A charter gives a time-boxed mission without prescribing every click. An example is: “Explore task editing as a viewer, varying navigation and direct API attempts, to discover any path that changes data.” Notes and evidence are recorded during the session.

### How do you keep traceability useful?

Each requirement maps to planned manual cases and, when implemented, specific automated checks. Status labels distinguish planned, automated, executed, passed, failed, and blocked. Traceability should expose gaps, not hide them.

## Design decisions and challenges

### Why build the application under test?

Public demos can change, disappear, rate-limit automation, or prohibit it. A small owned application gives stable, permitted, reproducible testing and lets me demonstrate controlled negative scenarios. I document that it is self-built so reviewers can judge the tradeoff.

### Why use in-memory storage?

It keeps setup fast and CI self-contained. The cost is that restart clears data and database risks are outside scope. I would use a containerized test database next if persistence became a requirement.

### Why are the app and tests together?

One repository is easier for a recruiter to run and for a junior engineer to maintain. The tests still use the public UI/API. A larger organization might keep system tests in a separate repository with independent ownership and release cycles.

### What was the most important reliability choice?

Isolated workspaces. Without them, parallel tests could share or delete state and become order-dependent. The header-based workspace design makes isolation visible and easy to explain.

## Practical interview demonstration

Aim for 6–8 minutes. Rehearse the path and keep a backup screenshot/report only if it came from a genuine run.

1. Open `README.md` and explain the problem, application choice, and strongest risks.
2. Show `docs/TEST_PLAN.md` and one row in `REQUIREMENTS_TRACEABILITY.md`.
3. Open one API spec. Point out workspace isolation, payload, status, and body assertions.
4. Open one UI spec beside its Page Object. Explain what is abstracted and what remains in the test.
5. Run one focused API test:

   ```powershell
   npm run test:api -- --grep "maximum 80-character"
   ```

6. Run one focused UI workflow in headed mode:

   ```powershell
   npm run test:ui -- --headed --grep "creates a task"
   ```

7. Open the generated HTML report and, if available from a genuine failed/debug run, briefly show how a trace helps investigation.
8. Show `screenshots/taskflow-dashboard.png` and `screenshots/regression-report.png`; explain that `npm run evidence:capture` produced them from the real app and report.
9. Show the GitHub Actions workflow. State its real verification status rather than assuming success.
10. Close with one limitation and the next improvement you would implement.

Before the interview, test both focused commands in the demo environment. Never improvise a command you have not tried.

## Honest closing statement

> This project demonstrates how I think about quality: start from requirements and risk, choose the right test layer, control data, make failures diagnosable, and report only evidence I actually have. It is intentionally not a production platform. Its current limits—ephemeral tasks and sessions, simplified identity, a Firefox sandbox launch blocker, and pending hosted CI verification—are documented, and I can explain the engineering path to address each one.
