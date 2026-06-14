# Review template

<review-template>
# Review Report

**Date:** YYYY-MM-DD HH:MM (local)
**Base Branch:** <main|master|...>
**Commit Range:** <base>...HEAD
**Reviewer Mode:** Independent two-lens (spec/scope + quality/risk)

## Diff Scope
- Files changed: <N>
- Key areas:
  - <path or module>
  - <path or module>

## Spec/Scope Review
**Verdict:** PASSED | NEEDS_CHANGES

### Findings
- [severity] [absolute/path/file.ext:line] <issue>

## Code Quality/Risk Review
**Verdict:** PASSED | NEEDS_CHANGES

### Findings
- [severity] [absolute/path/file.ext:line] <issue>

## Final Verdict
REVIEW: PASSED | REVIEW: NEEDS_CHANGES: <summary>

## Required Follow-ups
- [ ] <fix item 1 or N/A>
- [ ] <fix item 2 or N/A>
</review-template>