# GitHub Publishing Guide

## Current Status

The project is prepared locally. It has not been pushed, and GitHub Actions has not run. The GitHub CLI was not installed and no GitHub token was available during local verification.

Publishing is intentionally a separate phase because it creates a public external resource. Review the repository name, visibility, and tracked files before running these commands.

## Proposed Repository

- Name: `qa-engineering-portfolio`
- Visibility: public
- Description: `Production-style QA portfolio with Playwright TypeScript UI/API automation, manual test design, traceability, and GitHub Actions.`
- Topics: `qa`, `software-testing`, `playwright`, `typescript`, `api-testing`, `test-automation`, `sdet`, `github-actions`

## Review What Will Be Published

```bash
git status --short
git ls-files
git log --oneline --decorate -5
```

Confirm that `.env`, `node_modules/`, `.playwright-browsers/`, raw reports, and test result artifacts are not tracked.

## Option A: GitHub CLI

After installing the GitHub CLI and authenticating:

```bash
gh auth login
gh repo create qa-engineering-portfolio \
  --public \
  --source=. \
  --remote=origin \
  --push \
  --description "Production-style QA portfolio with Playwright TypeScript UI/API automation, manual test design, traceability, and GitHub Actions."

gh repo edit \
  --add-topic qa \
  --add-topic software-testing \
  --add-topic playwright \
  --add-topic typescript \
  --add-topic api-testing \
  --add-topic test-automation \
  --add-topic sdet \
  --add-topic github-actions
```

## Option B: GitHub Web UI and Git

Create an empty public repository named `qa-engineering-portfolio` without adding a README, license, or `.gitignore`, then run:

```bash
git remote add origin https://github.com/<your-user>/qa-engineering-portfolio.git
git branch -M main
git push -u origin main
```

Never force-push or reuse these commands against an unrelated existing repository.

## Verify the Remote and CI

```bash
git remote -v
git ls-remote --heads origin main
gh run list --workflow "QA regression" --limit 5
gh run watch <run-id> --exit-status
```

After the workflow completes, verify:

1. format, lint, type-check, and build are green;
2. API, Chromium UI, and integration jobs are green;
3. Firefox and WebKit jobs are green or accurately investigated;
4. report/trace artifacts are downloadable;
5. the README images render from the public repository;
6. only then add a GitHub Actions status badge using the real repository URL.

If a hosted runner fails, record the actual result and fix it before describing CI as passing.
