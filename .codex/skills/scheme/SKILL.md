---
name: scheme
description: Turn a scheme into a multi-phase implementation plan using tracer-bullet vertical slices, saved as a local Markdown file in ./docs/schemes/. Use when user wants to break down a spec, create an implementation plan, plan phases from a spec, or mentions "tracer bullets".
---

# Scheme Skill

Break a spec into a phased implementation plan using vertical slices (tracer bullets). Output is a Markdown file in `./docs/schemes/`.

**Fresh Context Requirement**:Both the schemer AND the reviewer must be **fresh subagents** to prevent context pollution.

## Process

### 1. Read spec and relevant project docs

1. Spec file must exist (from /interview)
2. Read `AGENTS.md (Learned Rules section)` for relevant past learnings
3. Read `docs/PROJECT.md` for project conventions

### 2. Explore the codebase

If you have not already explored the codebase, do so to understand the current architecture, existing patterns, and integration layers.

### 3. Identify durable architectural decisions

Before slicing, identify high-level decisions that are unlikely to change throughout implementation:

- Route structures / URL patterns
- Database schema shape
- Key data models
- Authentication / authorization approach
- Third-party service boundaries

These go in the plan header so every phase can reference them.

### 4. Draft vertical slices

Have five separate, PARALLEL software_architect break the spec down into **tracer bullet** phases. The five software_architect should try and come up with radically different approaches, but all NEED to follow the following rules for breakdown: 

- Each phase is a thin vertical slice that cuts through ALL integration layers end-to-end, NOT a horizontal slice of one layer.
- INVEST Criteria: Ensure each slice is Independent, Negotiable, Valuable, Estimable, Small, and Testable
- Each slice delivers a narrow but COMPLETE path through every layer (schema, API, UI, tests)
- A completed slice is demoable or verifiable on its own
- **Prefer many thin slices over few thick ones**
- Do NOT include specific file names, function names, or implementation details that are likely to change as later phases are built
- DO include durable decisions: route paths, schema shapes, data model names
- All slices need to be consistent with each other and build on each other. No slice should create code that doesn't get wired into production in the same slice.
- Use scaffolding and temporary code if needed to achieve vertical slicing, but these MUST be removed in future slices.
- Each slice should have clear verification steps that a manual reviewer can follow to confirm the behavior is correct.

Some examples of slicing along which subagents can diverge:
- Workflow Steps: Break a long process into individual steps (e.g., instead of "Checkout," use "Enter Shipping," "Enter Payment," "Confirm").
- Business Rules: Separate stories based on different constraints, such as payment methods (credit card vs. PayPal) or user types (guest vs. registered).
- Happy vs. Unhappy Path: Create one story for the ideal scenario and separate stories for error handling or alternative paths.
- Data Types/Variations: Start with a simple version of data input, then add complex data types in later stories.
- Extract a Spike: Start with the riskiest, most uncertain part first and build from there.
-...

### 5. Synthesize generated breakdowns 
Compare and critically analyze the five proposed breakdowns. Synthesize them into a single proposed breakdown that takes the best ideas from each while adhering to the vertical slice rules.

### 6. Quiz the user

Present the proposed breakdown as a numbered list. For each phase show:

- **Title**: short descriptive name
- **User stories covered**: which user stories from the spec this addresses

Ask the user:

- Does the granularity feel right? (too coarse / too fine)
- Should any phases be merged or split further?

Iterate until the user approves the breakdown.

### 7. Write the scheme file

Write the scheme file `docs/schemes/YYYY-MM-DD-<feature-name>.md` with the EXACT template from [scheme-template.md](scheme-template.md). Only replace placeholders.

### Step 8: Scheme reviews

Spawn two fresh subagents to review the scheme using the exact prompt in [reviewer-prompt.md](reviewer-prompt.md). Only replace placeholders.
1. Have business_analyst review spec compliance and slice quality
2. Have review_developer to review technical soundness

### Step 9: Incorporate Feedback

If any reviewer says NEEDS CHANGES:
1. Use /interview to clarify strategic questions 
2. Update the scheme -> Strongly prefere edits that shorten or modify existing specifications rather than adding new ones
3. Re-run reviewers
4. Repeat until APPROVED

### Step 10: Create Task Checklist

Write `tasks/todo.md` with the EXACT template from [task-list-template.md](task-list-template.md). Only replace placeholders. 

### Step 11: Create branch and commit planning docs

```bash
git checkout -b feature/<feature-name>
git add docs/schemes/YYYY-MM-DD-<feature>.md tasks/todo.md docs/specs/YYYY-MM-DD-<feature>.md
git commit -m "Finish planning for <feature-name>"
```