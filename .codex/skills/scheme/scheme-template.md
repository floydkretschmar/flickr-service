# Scheme template

<scheme-template>
# Scheme: <Feature Name>

> Source spec: <brief identifier or link>

## Architectural decisions

Durable decisions that apply across all phases:

- **Routes**: ...
- **Schema**: ...
- **Key models**: ...
- (add/remove sections as appropriate)

---

## Phase 1: <Title>

**User stories**: <list from spec>

### What to build
A simple 1-3 sentence description of the vertical slice. Reference architectural decisions from the spec where applicable

#### Step 1.1: Write failing test
An exhaustive list of ALL test scenarios and edgcases for a phase. Use the following format:

- [Test class 1]
    - [Flow 1]
        - [Happy path]: 
            - [input] -> [expected output]
            - [input2] -> [expected output2]
        - [Edge case 1]: [input1, input2] -> [expected output]
        - [Edge case 2]: [input1, input2] -> [expected output]
        - [Unhappy path]: [input1, input2, input3] -> [expected error]
    - [Flow 2]
        - ...
    - [Flow 3]
- [Test class 2]
    - ...
...

Do NOT produce concrete code. EVERY LOAD BEARING CLASS NEEDS TO HAVE CORRESPONDING TESTS

**Run:** Execute the narrowest relevant test command first (class/method if possible), then confirm it fails.
**Expect:** FAIL (red)

#### Step 1.2: Implement minimal code
A concise description of this vertical slice. Describe the end-to-end behavior, not layer-by-layer implementation.

#### Step 1.3: Verify test passes
**Run:** Execute the same narrow test command used in Step 1.1.
**Expect:** PASS (green)

#### Step 1.4: Aggressive refactor
A list of ALL possible refactor candidates for this vertical slice. This should be a comprehensive list of all relevant production code and test classes that can be refactored. The main goal of refactoring should be to REDUCE lines of code in compliance with DRY and YAGNI.

#### Step 1.5: Manual verification
All manual steps needed to verify the behavior in a real environment. A non-technical user needs to be able to execute these steps. Make sure to cover all critical user facing scenarios.

### Acceptance criteria

- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

---

## Phase 2: <Title>

**User stories**: <list from spec>

### What to build
...

#### Step 2.1: Write failing test
...

#### Step 2.2: Implement minimal code
...

#### Step 2.3: Verify test passes
...

#### Step 2.4: Aggressive refactor
...

#### Step 2.5: Manual verification (defered after review phase)
...

### Acceptance criteria

- [ ] ...

<!-- Repeat for each phase -->
</scheme-template>