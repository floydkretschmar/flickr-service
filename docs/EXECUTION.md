## Development Principles
- **Retry failed tool calls**: Failed tool calls are NOT unexpected and do NOT trigger stop-the-line by themselves; reexecute the tool call and only stop-the-line if the failure is not transient.
- **Test failures in changed classes are expected (RED PHASE)**: A regression in a test touched during the current implementation is expected debugging work, DO NOT STOP THE LINE FOR THIS.
- **Follow planning docs**: If a discrepancy appears between scheme or spec and implementation, do not retrofit them to match code. Fix implementation to match the approved planning docs instead.
- **Clean baseline**: Never continue execution or review work on a dirty baseline; restore `./run.sh test`, `./run.sh format`, and `./run.sh build` to green first.
- **Use websearch to fix tooling incompatibilities**: When tooling incompatibilities occur, use web verification to confirm the latest compatible versions before changing approach or switching tools.
- **In-phase review drift**: Treat review drift against an approved phase as a bug to fix immediately; do not create a separate todo item before dispatching the bug-fix subagent.

## Verification Before Done
- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- When changing code related to user-facing surfaces, always perform a full visual check with the Browser across the affected screens and controls
- Ask yourself: "Would a staff engineer approve this?"
- Run full validation suite (`./run.sh test`, `./run.sh format`, and `./run.sh build`) to prove correctness

## Coding conventions
**General principles:**
- NEVER use defaults for parameterized configuration via environment variables
- Never keep parallel abstractions that model the same responsibility; one canonical port path must exist and dead abstractions must be removed.
- Use proper error handling patterns (avoid try/catch when possible)
- Maintain consistent naming conventions

**Enforce Clarity**:
- Limit unnecessary complexity and nesting
- Eliminate redundant code and abstractions
- Consolidate related logic
- IMPORTANT: Avoid nested ternary operators - prefer switch statements or if/else chains for multiple conditions
- Choose clarity over brevity - explicit code is often better than overly compact code
- After refactoring, never leave unused artifacts behind; remove the maximum amount of dead code and configuration that can be deleted without changing behavior.

**Other Conventions**:
- Redact sensitive values before sharing outputs (`***REDACTED***`) and summarize instead of pasting raw credentials.
- Never use fallback defaults for required environment gates; require explicit values and fail fast when missing.
- Do not run review after individual slices within a phase. Execute the entire approved phase with fresh subagents first, then run one review cycle for the whole phase.

### Deep modules

When given the choice, always prefer implementing deep modules. From "A Philosophy of Software Design":

**Deep module** = small interface + lots of implementation

```
┌─────────────────────┐
│   Small Interface   │  ← Few methods, simple params
├─────────────────────┤
│                     │
│                     │
│  Deep Implementation│  ← Complex logic hidden
│                     │
│                     │
└─────────────────────┘
```

**Shallow module** = large interface + little implementation (avoid)

```
┌─────────────────────────────────┐
│       Large Interface           │  ← Many methods, complex params
├─────────────────────────────────┤
│  Thin Implementation            │  ← Just passes through
└─────────────────────────────────┘
```

When designing interfaces, ask:

- Can I reduce the number of methods?
- Can I simplify the parameters?
- Can I hide more complexity inside?
- Is the module deep without becoming a god module? As rough guidance, prefer 200-400 line modules with 1-3 public runtime exports when the responsibility is substantial.

### Design Interfaces for Testability

Good interfaces make testing natural:

1. **Accept dependencies, don't create them**

   ```pseudocode
   // Testable
   function process_order(order, payment_gateway):
     use payment_gateway to process order
   
   // Hard to test
   function process_order(order):
     payment_gateway = create_payment_gateway()
     use payment_gateway to process order
   ```

2. **Return results, don't produce side effects**

   ```pseudocode
   // Testable
   function calculate_discount(cart):
     return discount

   // Hard to test
   function apply_discount(cart):
     cart.total = cart.total - discount
   ```

3. **Small surface area**
   - Fewer methods = fewer tests needed
   - Fewer params = simpler test setup
