# GitHub Publication and Verification Record

## Published Repository

- Repository: [Mohamedatef27120/qa-engineering-portfolio](https://github.com/Mohamedatef27120/qa-engineering-portfolio)
- Visibility: public
- Default branch: `main`
- Initial published commit: `a6f3f31e1068c2e578b5ee50f5c752957df7a474`
- Description: `Professional QA engineering portfolio featuring Playwright API, UI, integration, cross-browser tests, manual test design, traceability, and CI.`
- Published: 18 November 2026

The repository was created empty through the GitHub web interface, then the prepared local `main` branch was pushed over HTTPS. The remote and local commit hashes were verified as equal immediately after publication.

## Verified Hosted CI

[GitHub Actions run 44394380121](https://github.com/Mohamedatef27120/qa-engineering-portfolio/actions/runs/44394380121) completed successfully on GitHub-hosted Ubuntu.

| Job                                   | Result    |
| ------------------------------------- | --------- |
| Quality gates and Chromium regression | Succeeded |
| Cross-browser UI — Firefox            | Succeeded |
| Cross-browser UI — WebKit             | Succeeded |

The quality-gates/Chromium job performed a clean checkout and `npm ci`, then ran formatting, lint, type-check, build, API, Chromium UI, and Chromium integration checks. The Firefox and WebKit matrix jobs each installed their browser and ran the full UI suite.

Three downloadable workflow artifacts were verified after the run:

- `playwright-regression-evidence`
- `playwright-firefox-evidence`
- `playwright-webkit-evidence`

The hosted Firefox success is separate from the local Windows result. Firefox could not launch inside the managed Windows sandbox, while the same UI project passed on GitHub-hosted Ubuntu.

## Live Status Badge

[![QA regression](https://github.com/Mohamedatef27120/qa-engineering-portfolio/actions/workflows/tests.yml/badge.svg?branch=main)](https://github.com/Mohamedatef27120/qa-engineering-portfolio/actions/workflows/tests.yml)

The badge reflects the latest `main` workflow state. The immutable run link above preserves the first verified publication result.

## Review Before Future Pushes

```bash
git status --short
git diff --check
git log --oneline --decorate -5
git ls-files
```

Confirm that `.env`, `node_modules/`, `.playwright-browsers/`, `dist/`, raw reports, and test-result artifacts remain untracked. Run the local gates before pushing:

```bash
npm run format:check
npm run lint
npm run typecheck
npm run build
npm run test:regression
```

## Safe Update Workflow

```bash
git add <reviewed-files>
git commit -m "<meaningful message>"
git push origin main
```

After each significant push:

1. open the [QA regression workflow](https://github.com/Mohamedatef27120/qa-engineering-portfolio/actions/workflows/tests.yml);
2. verify the quality-gates/Chromium, Firefox, and WebKit jobs;
3. inspect failures before retrying or changing code;
4. confirm evidence artifacts are available;
5. keep README and execution-report claims aligned with actual runs.

Never force-push `main` merely to hide a failed run. Preserve the failure evidence, correct the cause, and publish a new commit.
