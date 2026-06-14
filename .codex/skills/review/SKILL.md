---
name: review
description: Verify implementation quality using parallel subagents for comprehensive review. This should be used after implementation to ensure the new state of the codebase meets the expected quality standards.
---

# Review Skill

Run an independent, two-lens code review using fresh subagents.

## Purpose
Ensure every change set gets a separate review gate, even for small diffs. This skill is intentionally aligned with `execute` review standards.

## The Review Philosophy

> "Multiple perspectives catch more issues than one."

Review spawns **parallel subagents** focused many aspects of implementation quality:

1. **Spec Compliance** - Does the code match the spec?
2. **Code Quality** - Does it follow project conventions?
3. **Test Coverage** - Are edge cases covered?
4. **Security** - Any obvious vulnerabilities?
5. **Refactoring** - Has the proper level of cleanup refactoring been applied?

Summarize findings in a consolidated report with actionable feedback and automatically execute fixes for all blocking issues.

## Prerequisites

1. Verification commands have run (or are explicitly unavailable and documented)
2. Relevant spec/scheme files are available when reviewing feature work

## The Review Process

### Step 1: Gather Context
```
1. Find the spec file (docs/specs/*.md) if exists and verify scope for review
2. Read tasks/todo.md for task checklist to understand scope of current review
3. Check the current branch/commit for context on what changes are being reviewed
```

### Step 2: Spawn Two Fresh Review Subagents In Parallel

#### 2a. Spec/Scope Compliance Review

Have business_analyst review the spec using the EXACT prompt in [spec-quality-prompt.md](spec-quality-prompt.md). USE THE EXACT PROMPT WORD FOR WORD. Only replace placeholders.

#### 2b. Code Quality / Risk Review

Have review_developer review the spec using the EXACT prompt in [code-quality-prompt.md](code-quality-prompt.md). USE THE EXACT PROMPT WORD FOR WORD. Only replace placeholders.

### Step 3: Consolidate and persist review artifact

Return a single review summary. Follow the following rules:
- If either reviewer reports `NEEDS_CHANGES`, final verdict is `NEEDS_CHANGES`
- Findings are ordered by severity first
- Include concrete file/line references for actionable issues

Write `tasks/review.md` with:
- date/time
- base branch
- commit range
- both reviewer outputs
- final verdict

This file is the review gate artifact. Use the exact template from [review-template.md](review-template.md). Only replace placeholders.

---

## Quality Gates
Review is complete only when:
- [ ] Two independent review lenses ran (spec/scope + code quality)
- [ ] Final verdict is explicit
- [ ] Findings include file references
- [ ] `tasks/review.md` is updated using the exact template sections

## Output Contract

End with exactly one:
- `REVIEW: PASSED`
- `REVIEW: NEEDS_CHANGES: <summary>`