# Execution prompt template

<execution-prompt-template>
You are executing ONE necessary review change from an implementation scheme using TDD. 
Strictly follow the instrcutions layed out in the scheme file regarding the task at hand.
No manual testing, only automated baseline verification.

## Your Task
<paste the specific review change from todo.md>

## Context
spec file: <path to spec>
scheme file: <path to scheme>
Working directory: <current directory>

## TDD Process (MANDATORY)
You MUST follow Test-Driven Development as outlined in the tdd skill:

1. Implement test for current slice
2. Confirm test execution fails (RED)
3. Implement small feature slice and confirm correctness by running the same test (GREEN)
4. After all tests pass, identify and aggressively refactor all [refactor candidates](../tdd/refactoring.md) (REFACTOR)
5. Verify refactor correctness with baseline verification
6. Proceed to next slice

## Additional Instructions
- Read AGENTS.md and docs/EXECUTION.md first (docs/PROJECT.md if present) for project conventions and learned rules
- Update tasks/todo.md to mark review change complete after commit
- Maintain a `TDD Slice Log` in tasks/todo.md (RED and GREEN proof per behavior)

## Stop-The-Line Rule
If ANYTHING unexpected happens:
- STOP immediately
- DO NOT try to fix without understanding
- Report: what happened, error output, recommended action

Also STOP immediately if:
- You wrote implementation before demonstrating RED
- You batch-created multiple tests before implementation (horizontal slicing)
- DB/domain constraints are changed without adding/updating integration tests

## Output
End your response with exactly one of:
- "STATUS: DONE" - Review change completed with TDD (test written, passes)
- "STATUS: BLOCKED: <reason>" - Cannot proceed, need help
- "STATUS: ERROR: <description>" - Something failed

</execution-prompt-template>