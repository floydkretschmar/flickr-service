---
name: rearchitect
description: Explore a codebase to find opportunities for architectural improvement, focusing on making the codebase more testable by deepening shallow modules. Use when user wants to improve architecture, find refactoring opportunities, consolidate tightly-coupled modules, or make a codebase more AI-navigable.
---

# Improve Codebase Architecture

Explore a codebase like an AI would, surface architectural friction, discover opportunities for improving testability, and propose module-deepening refactors as GitHub issue RFCs.

A [deep module](../../../docs/EXECUTION.md#deep-modules) has a small interface hiding a large implementation. Deep modules are more testable, more AI-navigable, and let you test at the boundary instead of inside.

## Process

### 0. Understand previous design decisions

1. Read `docs/archive/*/SUMMARY.md` for understanding past features and decisions
2. Read docs/PROJECT.md

### 1. Explore the codebase

Have three **parallel** explorer navigate the codebase naturally. They should NOT follow rigid heuristics — explore organically and note where you experience friction:

- Where does understanding one concept require bouncing between many small files?
- Where are modules so shallow that the interface is nearly as complex as the implementation?
- Where have pure functions been extracted just for testability, but the real bugs hide in how they're called?
- Where do tightly-coupled modules create integration risk in the seams between them?
- Which parts of the codebase are untested, or hard to test?

The friction you encounter IS the signal.

### 2. Present candidates

Given the exploration results, have three new software_architect each generate a numbered list of at least 5 deepening opportunities in **parallel**. For each candidate, show:

- **Cluster**: Which modules/concepts are involved
- **Why they're coupled**: Shared types, call patterns, co-ownership of a concept
- **Dependency category**: See [refactor.md](refactor.md) for the four categories
- **Test impact**: What existing tests would be replaced by boundary tests

Do NOT propose interfaces yet. 

### 3. Unify deepening candidates
Compare the three lists and find clusters that appear across multiple software_architect. Generate a list of 3 unified candidates that combine similar suggestions. Ask the user: "Which of these would you like to explore?"

### 4. User picks a candidate

### 5. Frame the problem space

Write a user-facing explanation of the problem space for the chosen candidate:

- The constraints any new interface would need to satisfy
- The dependencies it would need to rely on
- A rough illustrative code sketch to make the constraints concrete — this is not a proposal, just a way to ground the constraints

Show this to the user, then immediately proceed to Step 6. The user reads and thinks about the problem while the sub-agents work in parallel.

### 6. Design multiple interfaces

Have 3+ software_architect produce a **radically different** interface for the deepened module **in parallel**.

Prompt each sub-agent with a separate technical brief (file paths, coupling details, dependency category, what's being hidden). This brief is independent of the user-facing explanation in Step 4. Give each agent a different design constraint:

- Agent 1: "Minimize the interface — aim for 1-3 entry points max"
- Agent 2: "Maximize flexibility — support many use cases and extension"
- Agent 3: "Optimize for the most common caller — make the default case trivial"
- Agent 4 (if applicable): "Design around the ports & adapters pattern for cross-boundary dependencies"

Each sub-agent outputs:

1. Interface signature (types, methods, params)
2. Usage example showing how callers use it
3. What complexity it hides internally
4. Dependency strategy (how deps are handled — see [refactor.md](refactor.md))
5. Trade-offs

Present designs sequentially, then compare them in prose.

After comparing, give your own recommendation: which design you think is strongest and why. If elements from different designs would combine well, propose a hybrid. Be opinionated — the user wants a strong read, not just a menu. Strongly prefer simplicity over architecture bloat. Strongly prefer locality of functionality over generic flexibility.

### 7. User picks an interface (or accepts recommendation)

### 8. Create a spec
Create a refactor spec in `docs/specs/YYYY-MM-DD-<refactor-description>.md`. Use the EXACT template from [spec-template.md](../plan-feature/spec-template.md). Only replace placeholders.

### 9. Spec review 
Have the spec reviewed by business_analyst to ensure alignment with the user interview and decisions
