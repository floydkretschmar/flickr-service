---
name: execute
description: Execute an implementation scheme using subagents for each phase until completion. This should be used after a scheme is created and the user is ready to start implementation.
---

# Execute Skill
Execute an implementation scheme using fresh subagents for each phase until completion.

## The Execute Philosophy
> "Iteration > Perfection. Failures are data. Keep trying until success."

Execute spawns a **fresh subagent** for each phase to prevent context pollution. Each iteration:
1. Fresh context (no pollution from previous phases)
2. Works on ONE phase only
3. Reports back status (DONE, BLOCKED, or ERROR)

## Quality Gates

**Each subagent must:**
- Touch only ONE phase
- Follow TDD (test first)
- Run verification before committing
- Update tasks/todo.md

**Cannot mark COMPLETE until:**
- All phases checked off
- Full test suite passes
- Lint clean
- Build succeeds
- Spec compliance review passes
- Code quality review passes

## Red Flags
- Skipping tests to "move faster"
- Multiple phases in one subagent
- Ignoring test failures
- Making changes not in the scheme

## Stop-The-Line Protocol

When a subagent reports ERROR or you detect issues:
```markdown
## STOP-THE-LINE TRIGGERED

**What happened:**
[Describe the unexpected behavior]

**Evidence:**
[Error output, test failure, etc.]

**Current state:**
- Files changed: [list]
- Tests status: [pass/fail]

**Recommended action:**
[What should happen next]

Awaiting user decision before proceeding.
```

**Do NOT:**
- Spawn more subagents
- Try to fix without user input
- Proceed to next phase
- Make speculative changes
- Commit anything


## Prerequisites
```
1. Implementation scheme exists at docs/schemes/*.md
2. Read AGENTS.md and docs/PROJECT.md for project conventions
3. All tests should pass before starting (clean baseline)
```

## Phases

When this skill is invoked, follow these steps:
```
Step 1: Initialize ──> Step 2: Execute next phase ──> Step 3: Review implemented phase ──> Step 4: Manual test implemented phase ──> Step 5: Final Verification ──> Step 6: Completion Output
                                         ↑                                                                        │                    
                                         └────────────────────────────────────────────────────────────────────────┘                  
                                                               (continue implementation)                                                                                                                                                                                              
```


### Step 1: Initialize

```
1. Read the scheme file
2. Read tasks/todo.md with phase checklist from scheme
3. Run initial verification to establish baseline:
   - all tests should pass
   - build should succeed
4. If baseline fails, STOP and report
```

### Step 2: Execute Phases with Fresh Subagents

**For EACH incomplete phase** use a fresh subagent with the EXACT prompt in [execution-prompt.md](execution-prompt.md) to execute the phase using TDD. ONLY replace placeholders, otherwise use the prompt verbatim.

**Chose subagent according to task**:
- frontend_developer: UI/UX heavy task that are user facing
- backend_developer: Backend/server heavy task mainly involving system to system interaction

**After each subagent completes:**

**If STATUS: DONE**
- Proceed to Step 3.

**If STATUS: BLOCKED**
- Report the blocker to the user
- Ask how to proceed
- Do NOT spawn more subagents until resolved

**If STATUS: ERROR**
- Report the error to the user
- Invoke stop-the-line protocol
- Do NOT proceed

### Step 3: Phase verification

ONE phase has been completed invoke the standalone `review` skill for a comprehensive review of the implemented phase. FOLLOW THE EXACT INSTRUCTIONS IN THE REVIEW SKILL.

**If review returns `REVIEW: PASSED`:**
- Proceed to Step 4

**If review returns `REVIEW: NEEDS_CHANGES`:**
- Evaluate: "Is this a regression given the overall spec scope?"
- If its a regression, add issues to tasks/todo.md after the current phase as an addendum and return to Step 3
- If its deemed outside the scope of the spec, proceed to completion output

### Step 4: Manual testing and commit
One phases are marked complete have a qa_engineer manually test the phase as described in the scheme.

- If manual testing fails: go back to Step 3 and fix the issue with a fresh subagent.
- If manual testing is successful: commit all changes related to the current phase with a descriptive commit message. If all implementation phases are done: continue to the Step 5 otherwise continue with Step 3 for the next implementation phase

### Step 5: Final Verification

After all phases are completed invoke the standalone `review` skill for a final comprehensive review of the entire implementation. FOLLOW THE EXACT INSTRUCTIONS IN THE REVIEW SKILL.

**If review returns `REVIEW: PASSED`:**
- Proceed to Step 6

**If review returns `REVIEW: NEEDS_CHANGES`:**
- Report findings to user
- Evaluate: "Is this a regression given the overall spec scope?"
- If its a regression, add issues to tasks/todo.md after the current phase as an addendum and return to Step 3
- If its deemed outside the scope of the spec, proceed to completion output

### Step 6: Completion Output and Auto-Chain to Finish

When all phases are marked complete: 

1. Run formatting and execute all tests
2. Present completion summary
3. Ask user to continue directly with `finish`

