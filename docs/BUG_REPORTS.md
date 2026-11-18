# Defect Log and Reporting Guide

## Current Genuine Defect Summary

**No genuine product defects were found in the executed automated checks.**

On 2026-11-18, local automation passed API 33/33, Chromium UI 13/13, Chromium integration 1/1, the default 47-test regression twice (94/94 total), and WebKit UI 13/13. Final post-expansion formatting, lint, type-check, and build gates passed locally. Manual test cases and exploratory charters remain unexecuted, so this is not a claim that TaskFlow QA is defect-free. A defect will be added only after unexpected behavior is observed, reproduced, compared with the requirement or another valid oracle, and distinguished from a test, data, or environment problem.

No simulated or intentionally seeded defect is included in this log.

### Non-product infrastructure observation

Playwright Firefox executed 0 tests because its browser process crashed before page access in this Windows sandbox with `NS_ERROR_FAILURE` while attempting registry access. Because no TaskFlow page was accessed and Chromium/WebKit coverage passed, this is classified as a local infrastructure limitation, not a TaskFlow product defect or Firefox test failure. The GitHub-hosted Ubuntu Firefox job later passed in [Actions run 44394380121](https://github.com/Mohamedatef27120/qa-engineering-portfolio/actions/runs/44394380121), confirming the blocker was environment-specific.

## Defect Lifecycle

```text
New → Triaged → In Progress → Ready for Retest → Closed
  └──────────────→ Rejected / Duplicate / Cannot Reproduce / Deferred
```

- **New:** reported with enough information to investigate.
- **Triaged:** validity, severity, priority, and owner reviewed.
- **In Progress:** a fix is being developed.
- **Ready for Retest:** a candidate fix is available in an identified build.
- **Closed:** expected behavior is confirmed and regression coverage is considered.
- **Rejected:** behavior matches requirements or lacks a valid defect oracle.
- **Duplicate:** an existing defect represents the same root problem.
- **Cannot Reproduce:** repeated attempts in the documented environment do not reproduce it; evidence remains available.
- **Deferred:** valid defect accepted for later work with rationale.

## Severity Definitions

Severity describes impact on the product, independent of scheduling.

| Severity      | Definition                                                                                                  | TaskFlow QA examples                                                                                        |
| ------------- | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Critical (S1) | Security/data isolation breach, unrecoverable widespread data loss, or application unusable for all actors. | Viewer deletes tasks; one workspace reads another's tasks; reset exposed in non-test mode and deletes data. |
| High (S2)     | Core workflow is unavailable or produces significant incorrect data with no reasonable workaround.          | Writer cannot log in or create any task; updates corrupt task fields.                                       |
| Medium (S3)   | Important behavior is wrong but scope is limited or a reasonable workaround exists.                         | Combined filtering omits qualifying tasks; one valid boundary is rejected.                                  |
| Low (S4)      | Minor usability, presentation, or wording problem with little functional impact.                            | Misaligned label; non-blocking unclear helper text.                                                         |

## Priority Definitions

Priority describes how urgently the team should address the defect.

| Priority | Definition                                                                     |
| -------- | ------------------------------------------------------------------------------ |
| P0       | Fix immediately; blocks safe testing/release or exposes data/access.           |
| P1       | Fix before the target milestone; affects core behavior or reliable regression. |
| P2       | Plan for a near-term iteration; meaningful but not release-blocking.           |
| P3       | Backlog candidate; low impact or cosmetic improvement.                         |

Severity and priority may differ. For example, a spelling error on a recruiter-facing landing screen could be Low severity but P1 priority because it damages the portfolio demonstration.

## Triage Checklist

Before creating a defect:

1. Reproduce from a known/reset state.
2. Record the exact commit/build, environment, browser/API client, and actor.
3. Compare with `REQUIREMENTS.md` or another named oracle.
4. Check whether test code, stale data, configuration, or environment caused the result.
5. Reduce the steps to the shortest reliable sequence.
6. Capture relevant evidence without exposing secrets or personal data.
7. Search this log for an existing report with the same root behavior.

## Genuine Defects

No entries.

## Blank Defect Template

This is a blank template, not a reported or simulated defect.

```markdown
### BUG-XXX — Concise observable problem

| Field                 | Value                                     |
| --------------------- | ----------------------------------------- |
| Status                | New                                       |
| Severity              | Critical / High / Medium / Low            |
| Priority              | P0 / P1 / P2 / P3                         |
| Requirement / oracle  | REQ-... or named source                   |
| Found in commit/build |                                           |
| Environment           | OS, Node version, `TEST_MODE`, base URL   |
| Browser / client      | Browser and version, or APIRequestContext |
| Actor / workspace     |                                           |
| Reproducibility       | e.g. 3/3 attempts                         |
| Reporter and date     |                                           |

#### Preconditions

1.

#### Steps to reproduce

1.
2.
3.

#### Test data

-

#### Expected behavior

#### Actual behavior

#### Evidence

- Screenshot/trace/report/request-response reference:
- Relevant sanitized log:

#### Impact

#### Workaround

None known, or describe it.

#### Investigation / root cause

Pending. Do not guess.

#### Retest record

| Date | Fix commit/build | Environment | Result       | Evidence |
| ---- | ---------------- | ----------- | ------------ | -------- |
|      |                  |             | Not retested |          |

#### Regression coverage

- Planned/added automated or manual regression case:
```

## Evidence Handling

- Prefer a Playwright trace, screenshot, report entry, and sanitized request/response that directly supports the report.
- Do not commit session tokens, real credentials, personal data, or large unrelated logs.
- State when evidence is unavailable and why.
- A passing retest closes the defect only for the verified build/environment; it does not rewrite the original observation.
