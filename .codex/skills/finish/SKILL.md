---
name: finish
description: This is in the implementation cycle of a user requested feature. The implementation is complete and now we need to verify, document, and create a PR. This should be used after /execute completes all tasks, or the user indicates they are ready to finish the branch.
---

# Finish Skill

Complete a development branch with proper verification, documentation, and PR creation.

## Prerequisites

- All tasks in `tasks/todo.md` marked complete
- Tests passing
- Review artifact exists at `tasks/review.md` with final verdicts

## The Finish Process

### Step 1: Verify Everything

Run full verification suite:

```bash
# Run all checks
./run.sh test              # Tests pass
./run.sh format            # Formatting is clean
./run.sh build             # Build succeeds
```

**Do NOT proceed if any verification fails.**

Additional mandatory checks before PR:
- `tasks/todo.md` includes a `TDD Slice Log` with RED and GREEN evidence per implemented behavior
- If DB/domain constraints were touched (or relied on), integration test coverage is explicitly listed

### Step 2: Capture Learnings

Ask: "Any lessons from this implementation?"
If yes, add to `AGENTS.md`, `docs/EXECUTION.md` or `docs/TESTING.md` as appropriate

### Step 3: Update technical architecture docs
After each feature review `docs/PROJECT.md` and update if necessary:
- Modules: Keep the description for each module tight. One sentence max, and only the highest level of abstraction.
- Convetions: Only add or modify if there has been a colossal, fundamental shift in how we do things. 

### Step 4: Archive feature docs:
Move spec from `docs/specs/YYYY-MM-DD-feature-name.md` to `docs/archive/YYYY-MM-DD-feature-name/SPEC.md`, and move related scheme from `docs/schemes/YYYY-MM-DD-feature-name.md` to `docs/archive/YYYY-MM-DD-feature-name/SCHEME.md`.
Delete `tasks/todo.md` and `tasks/review.md` for this feature.

### Step 5: Documentation

1. Create `docs/archive/YYYY-MM-DD-feature-name/SUMMARY.md` according to the [summary-template](./summary-template.md)
2. Update README.md if there are any new setup steps or important information for developers related to this feature.
