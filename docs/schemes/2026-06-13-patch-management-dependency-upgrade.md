# Scheme: Patch Management And Dependency Upgrade

> Source spec: docs/specs/2026-06-13-patch-management-dependency-upgrade.md

## Architectural decisions

Durable decisions that apply across all phases:

- **Routes**: Keep the public HTTP API unchanged at `GET /photos/:albumId`; pagination defaults, error statuses, CORS behavior, rate limiting, Flickr DTO mapping, bucket-backed image URLs, and fallback URLs remain the compatibility contract.
- **Schema**: No database or public response schema is introduced. The durable contract is the runtime and dependency policy: Node `24.16.0`, npm `11.13.0`, exact direct dependency pins, strict engines, exact saves, and a 7-day npm release-age delay.
- **Key models**: Preserve existing public photo DTOs and Flickr service payload mapping. Add only maintenance-policy concepts that are durable across the implementation: local validation gates, dependency policy verification, CI baseline checks, Docker digest pinning, Dependabot update intake, and safe automerge eligibility.
- **Authentication and authorization**: No application authentication or authorization is added. The only privileged workflow boundary is Dependabot automerge; it must not check out or execute pull request code while using elevated permissions.
- **Third-party service boundaries**: Preserve the Flickr REST boundary and Fly deployment path. CI and Docker must use `npm ci` against the reviewed lockfile. Dependabot manages npm, Docker, and GitHub Actions update discovery with a 7-day cooldown.
- **Upgrade policy**: Production application code changes are allowed only when Node 24, Express 5, TypeScript 6, Vitest 4, or middleware upgrades produce a failing test or compiler error. Fix the smallest proven compatibility issue, rerun the affected check, then refactor after green.
- **Repository policy validation**: Use one small repository-contract verifier, wired into `./run.sh test`, for runtime, dependency, CI, Docker, Dependabot, and automerge configuration checks. Extend it phase-by-phase and enforce only completed slices until final verification. Live validation for a surface starts only in the phase that builds or updates that surface; earlier phases use fixtures or documentation-presence checks for future CI, Docker, Dependabot, and automerge rules. Do not create a parallel YAML test framework.
- **Matrix proof versus durable policy**: Exact spec-version checks are one-time landing proof for the implementation phases that introduce the runtime, package, Docker, and action matrices. `docs/PROJECT.md` records that target matrix as maintainer-facing landing evidence; the ongoing `npm run verify:policy` gate must enforce durable invariants instead: exact direct dependency pins, lockfile/package consistency, npm policy, runtime contract, digest-pinned Docker base shape, Dependabot config, and safe workflow policy. It must not reject a legitimate future Dependabot npm, Docker, or GitHub Actions update solely because a package version, Docker digest/tag, action ref, or historical matrix documentation changed from or still records this scheme's original target matrix.
- **CI status contract**: CI must expose stable current-head GitHub check runs or commit statuses, not only step names, that automerge can query separately for install, audit signatures, high-severity vulnerability audit, format, build, and test/coverage. The exact context/check names are `ci/install`, `ci/audit-signatures`, `ci/audit-vulnerabilities`, `ci/format`, `ci/build`, and `ci/test-coverage`, and the automerge workflow must consume only those names.
- **Dependabot metadata handoff**: Use a data-only commit status with `context: dependabot/metadata` and `state: success` as the selected metadata carrier between the Dependabot metadata job and the post-CI automerge job. Store the compact JSON metadata in the status `description` field and fail if it cannot fit the GitHub status description limit. This avoids checking out PR code, avoids artifact marketplace actions, gives the post-CI path an API-visible record on the exact head SHA, and keeps the payload intentionally tiny.
- **Automerge SHA source**: Treat `workflow_run` as a wake-up signal, not as proof of the pull request head SHA. The post-CI automerge workflow must map the completed run to exactly one open Dependabot pull request, resolve the current `PR.head.sha` from the pull request API, and use only that resolved head SHA for metadata lookup, CI status proof, and `--match-head-commit`.
- **External repository settings**: Required checks and GitHub auto-merge settings are partly outside the repository. In-repo workflow behavior must be verified, and missing repository settings are implementation blockers that require owner action rather than deferred cleanup.
- **Testing ownership**: Do not produce concrete code in the scheme. Every load-bearing verifier, helper, or decision module introduced during implementation needs focused tests. Workflow, Docker, and Dependabot configuration behavior may be covered by repository-policy fixture tests plus required manual evidence.

---

## Phase 1: Real Local Validation Gates

**User stories**: 1, 2, 3

### What to build

Make the project wrapper commands meaningful before runtime and dependency movement. `./run.sh test` should execute `npm run coverage`, while `./run.sh format` and `./run.sh build` should execute real formatting and TypeScript build gates against maintained project files.

#### Step 1.1: Write failing test

An exhaustive list of ALL test scenarios and edgcases for a phase. Use the following format:

- Wrapper validation behavior
  - Test command dispatch
    - Happy path:
      - `./run.sh test` with passing package tests -> exits `0` after running `npm run coverage`
      - `./run.sh format` with formatted maintained files -> exits `0` after running the Prettier check
      - `./run.sh build` with compilable TypeScript -> exits `0` after running the TypeScript build
    - Edge case 1: unknown wrapper command -> exits non-zero and prints available commands
    - Edge case 2: underlying command exits non-zero -> wrapper exits non-zero
    - Unhappy path: placeholder `test`, `format`, or `build` body remains -> verification fails
- Package script behavior
  - Format script
    - Happy path: maintained-file scope is passed to Prettier -> source, docs, workflows, package metadata, lockfile, and TypeScript config are checked
    - Edge case 1: local Codex skill or plugin internals are included -> verification fails
    - Edge case 2: a maintained repository file required by the spec is omitted -> verification fails
- Existing test modules
  - Current API behavior
    - Happy path: existing controller, service, server, and Flickr tests still pass through the coverage gate after wrapper wiring
    - Unhappy path: wrapper changes alter public API behavior -> existing tests fail

**Run:** Execute the narrowest relevant wrapper or package-script test command first, then confirm it fails because the wrapper still contains placeholder validation behavior or does not run coverage.
**Expect:** FAIL (red)

#### Step 1.2: Implement minimal code

Replace placeholder validation bodies with real commands while keeping the existing API and runtime state otherwise unchanged. Make `./run.sh test` run `npm run coverage`, add the maintained-file formatting command, and route wrapper failures through normal process exit codes.

#### Step 1.3: Verify test passes

**Run:** Execute the same narrow wrapper or package-script test command used in Step 1.1.
**Expect:** PASS (green)

#### Step 1.4: Aggressive refactor

- Remove duplicate shell branches or dead placeholder text from the wrapper.
- Prefer one simple command dispatch path over separate ad hoc implementations.
- Keep package scripts minimal and named for behavior, not implementation.
- Avoid adding wrapper abstractions beyond what is needed for `test`, `format`, and `build`.

#### Step 1.5: Manual verification

From the repository root, run `rtk ./run.sh test`, `rtk ./run.sh format`, and `rtk ./run.sh build`. Confirm each command runs real work, exits non-zero when its underlying command fails, and does not modify production application behavior.

### Acceptance criteria

- [ ] `./run.sh test` executes `npm run coverage`.
- [ ] `./run.sh format` checks the maintained-file Prettier scope from the spec and excludes local Codex internals.
- [ ] `./run.sh build` executes the TypeScript build.
- [ ] Public `GET /photos/:albumId` behavior remains unchanged.

---

## Phase 2: Runtime And Dependency Policy Contract

**User stories**: 4, 5, 6, 7, 8, 9, 10, 16, 17, 27, 28

### What to build

Install the repository-owned runtime and dependency policy before the package upgrade. The project should declare Node `24.16.0`, npm `11.13.0`, exact direct dependency requirements for the current dependency set, strict npm policy, removed unused direct dependencies, and pinned bootstrap installer versions. Add and wire the policy verifier before satisfying it; defer the approved target dependency matrix and live `min-release-age=7` enforcement until Phase 3 has created the reviewed target lockfile.

#### Step 2.1: Write failing test

- Dependency policy verification
  - Verifier logic tests
    - Happy path: representative table or fixture cases for runtime metadata, exact dependency pins, npm policy, version matrix documentation, bootstrap pins, and durable-policy behavior pass -> verifier unit tests pass
    - Edge case 1: each representative invalid runtime, dependency, npm policy, documentation, or bootstrap fixture fails for the expected reason -> verifier unit tests pass
    - Edge case 2: verifier only checks the live repository and has no focused pass/fail coverage for its own logic -> verification fails
    - Edge case 3: verifier derives expected values from `package.json`, `package-lock.json`, workflows, Dockerfile, or the live file being checked instead of verifier-owned constants or fixtures derived from the spec and `docs/PROJECT.md` matrix -> verification fails
    - Edge case 4: ongoing `npm run verify:policy` permanently rejects a valid future Dependabot update solely because a package version, Docker digest/tag, or GitHub Actions ref differs from the original target matrix -> verification fails
    - Edge case 5: Phase 2 live verifier requires live CI workflow, Dockerfile, Dependabot, or automerge state before those later phases own the surfaces -> verification fails
  - Verifier public entrypoint
    - Happy path: `npm run verify:policy` invokes `scripts/verify-dependency-policy.mjs`, reads a repository-shaped fixture or the live repository, and exits `0` for valid state -> integration test passes
    - Edge case 1: entrypoint reads a repository-shaped invalid fixture and exits non-zero with a useful message -> integration test passes
    - Edge case 2: helper tests pass but the package script or CLI entrypoint is broken -> verification fails
  - Runtime matrix
    - Happy path: Node target, npm target, package manager, engine, and `.nvmrc` all match the spec -> verifier passes
    - Edge case 1: Node target differs from `24.16.0` -> verifier fails
    - Edge case 2: npm target differs from `11.13.0` -> verifier fails
    - Edge case 3: package manager metadata is absent or not `npm@11.13.0` -> verifier fails
    - Unhappy path: unsupported runtime can install dependencies without error -> verification fails
  - Direct dependency policy
    - Happy path: every current direct production and development dependency is an exact version -> verifier passes
    - Edge case 1: caret, tilde, range, tag, or workspace-style direct dependency version exists -> verifier fails
    - Edge case 2: `express-validator` remains as a direct dependency after usage is confirmed absent -> verifier fails
    - Edge case 3: `@flydotio/dockerfile` remains as a direct development dependency after usage is confirmed absent -> verifier fails
    - Edge case 4: verifier hard-codes the original package target matrix into the ongoing `npm run verify:policy` gate instead of checking exact pins and package/lockfile consistency -> verification fails
  - npm policy
    - Happy path: exact save and strict engine settings exist for the Phase 2 live repo -> verifier passes
    - Edge case 1: exact save is missing -> verifier fails
    - Edge case 2: strict engine is missing -> verifier fails
    - Edge case 3: numeric `min-release-age=7` fixture coverage is missing from verifier tests -> verification fails
    - Edge case 4: live `min-release-age=7` enforcement happens before the reviewed target lockfile exists -> verification fails
  - Version matrix documentation
    - Happy path: the exact Node, npm, package manager, Docker base, dependency, action, and bootstrap matrix is documented in `docs/PROJECT.md` as maintainer-facing landing evidence -> verifier or review passes
    - Edge case 1: implementation relies only on an implementation note or transient task log -> verification fails
    - Edge case 2: documented Phase 2-owned runtime, npm, current exact dependency pins, or bootstrap metadata differs from the Phase 2 live state during landing -> verification fails
    - Edge case 3: Docker, CI, action, Dependabot, or automerge targets are undocumented -> verification fails, but their live consistency checks are deferred until their later phases exist
    - Edge case 4: ongoing `npm run verify:policy` fails a future valid Dependabot update solely because `docs/PROJECT.md` still records the original package, Docker, or action target matrix -> verification fails
  - Bootstrap pinning
    - Happy path: mutable installer references are pinned to the spec matrix -> verifier passes
    - Edge case 1: bootstrap fetches installer state from a moving branch or latest tag -> verifier fails
- Usage checks before removal
  - Dependency surface
    - Happy path: removed dependencies appear only in manifests, lockfile, and planning docs -> removal can proceed
    - Unhappy path: removed dependency appears in source, tests, scripts, or workflows -> implementation stops for a spec change

**Run:** Execute the narrowest policy verifier test or package metadata check first, then confirm it fails against the current Node 22, npm drift, missing package metadata, missing npm policy, ranged direct dependencies, and unused direct dependencies.
**Expect:** FAIL (red)

#### Step 2.2: Implement minimal code

First add `scripts/verify-dependency-policy.mjs` and focused verifier tests, add `npm run verify:policy` that invokes that script, and wire `./run.sh test` to run `npm run verify:policy` before `npm run coverage`; confirm this is red before changing runtime or dependency metadata. Keep expected policy values in verifier-owned constants or fixtures derived from the spec and `docs/PROJECT.md`. During Phase 2, compare only Phase 2-owned live files and metadata against those expectations, including runtime/package metadata, `.nvmrc`, Phase 2 npm policy keys, current exact dependency pins, lockfile/package consistency, bootstrap pins, and `docs/PROJECT.md` landing documentation. Use representative fixtures or documentation-presence checks for future CI, Docker, Dependabot, and automerge behavior until their later phases activate live validation. Then update runtime metadata, Phase 2 npm policy, direct dependency declarations for the current dependency set, bootstrap pins, and lockfile state so the verifier describes the repository's reviewed dependency contract. Do not activate the approved Express/TypeScript/Vitest target package matrix or reviewed target lockfile in this phase; Phase 3 owns that movement.

#### Step 2.3: Verify test passes

**Run:** Execute the same narrow policy verifier test or package metadata check used in Step 2.1.
**Expect:** PASS (green)

#### Step 2.4: Aggressive refactor

- Keep the policy verifier small and data-driven around durable policy invariants, with separate one-time target-matrix checks for phases that need to prove a specific matrix landed.
- Remove duplicated version literals by centralizing expected values inside verifier-owned constants or fixtures derived from the spec and `docs/PROJECT.md`; do not derive expected values from `package.json` or other live files being verified.
- Prefer deleting unused dependency entries over adding compatibility shims.
- Simplify bootstrap setup while preserving the pinned installer targets required by the spec.

#### Step 2.5: Manual verification

Run `rtk npm ci` under Node `24.16.0` with npm `11.13.0`, then run `rtk ./run.sh test`. Confirm the wrapper runs both `npm run verify:policy` and `npm run coverage`, current direct dependencies are exact pins, `.npmrc` contains `save-exact=true` and `engine-strict=true`, live `min-release-age=7` enforcement is still deferred until the reviewed target lockfile exists, removed direct dependencies have no source/test/script/workflow usage, install fails on an unsupported Node version when that can be safely checked, `.nvmrc` is exactly `24.16.0`, Phase 2 live validation does not require later CI/Docker/Dependabot/automerge surfaces before their phases, the ongoing policy gate is not hard-coded to reject future valid Dependabot updates solely for version/digest/ref movement or stale historical matrix docs, and the exact version matrix is documented in `docs/PROJECT.md`.

### Acceptance criteria

- [ ] The repository declares Node `24.16.0`, npm `11.13.0`, `engines.node`, and `packageManager`.
- [ ] `.nvmrc` is exactly `24.16.0`.
- [ ] `.npmrc` enforces exact saves and strict engines; live numeric 7-day release-age enforcement is deferred until Phase 3.
- [ ] All current direct dependency versions are exact pins.
- [ ] `express-validator` and `@flydotio/dockerfile` are removed only after usage checks confirm they are unused.
- [ ] `scripts/verify-dependency-policy.mjs` has focused pass/fail tests, public-entrypoint coverage through `npm run verify:policy`, and is part of `./run.sh test` alongside `npm run coverage`.
- [ ] The ongoing policy verifier enforces durable invariants without hard-coding the original package, Docker digest/tag, or action target matrix as permanent CI blockers for future valid Dependabot updates.
- [ ] Phase 2 live validation enforces only Phase 2-owned live files and uses fixtures or documentation-presence checks for later CI, Docker, Dependabot, and automerge surfaces until those phases activate live validation.
- [ ] Mutable bootstrap installs are pinned to the spec matrix.
- [ ] The exact version matrix is documented in `docs/PROJECT.md` as maintainer-facing landing evidence.

---

## Phase 3: Minimal Toolchain And Package Upgrade

**User stories**: 29, 30, 31

### What to build

Move to the approved dependency matrix for Express, middleware, TypeScript, Vitest, coverage, and related type packages. Preserve public API behavior and touch production code only when a failing test or compiler error proves an upgrade compatibility issue.

#### Step 3.1: Write failing test

- Existing API compatibility
  - Controller behavior
    - Happy path: valid Flickr album request -> `200` with existing public photo DTO shape
    - Edge case 1: empty page result -> `404`
    - Edge case 2: invalid page number -> `422`
    - Unhappy path: unexpected service failure -> `500`
  - Server middleware behavior
    - Happy path: allowed origin -> CORS permits request
    - Edge case 1: wildcard or no-origin behavior follows current server policy -> accepted or rejected as before
    - Edge case 2: rate limiting remains registered for the photo route behind trusted proxy settings
    - Edge case 3: express-rate-limit v8 key behavior, including IPv6 `/56` subnet grouping behind Fly/trust-proxy settings, remains intentional and documented by tests or manual evidence
  - Service mapping behavior
    - Happy path: Flickr payload with dates, thumbnails, views, original image id, and fallback URL -> public DTO fields match current behavior
    - Edge case 1: missing optional fields handled as current tests describe
- Toolchain compatibility
  - Exact dependency matrix
    - Happy path: `package.json` and `package-lock.json` match every exact production and development dependency target from the spec matrix -> verifier passes
    - Edge case 1: any direct dependency version differs from the approved matrix -> verifier fails
    - Edge case 2: a removed direct dependency remains in the manifest or lockfile after usage checks pass -> verifier fails
    - Edge case 3: lockfile root package metadata drifts from `package.json` -> verifier fails
    - Edge case 4: one-time target-matrix checks are wired as permanent `npm run verify:policy` blockers after the landing proof has passed -> verification fails
  - npm release-age bootstrap
    - Happy path: reviewed target lockfile exists before `.npmrc` is finalized exactly as `save-exact=true`, `engine-strict=true`, and `min-release-age=7` -> verifier passes
    - Edge case 1: `min-release-age=7` is enabled before the reviewed target lockfile exists -> verifier fails
    - Edge case 2: reviewed target lockfile exists but `.npmrc` is not finalized with numeric `min-release-age=7` -> verifier fails
    - Edge case 3: `npm ci` fails against the reviewed target lockfile after release-age policy is enabled -> verification fails
    - Edge case 4: finalized `.npmrc` contains contradictory or additional install-policy keys beyond the three spec settings -> verifier fails
  - TypeScript 6
    - Happy path: explicit module, target, root directory, and strict settings remain effective -> build passes
    - Edge case 1: compiler default changes create type errors -> build fails before production code is changed
  - Vitest 4 coverage
    - Happy path: coverage command runs with meaningful reports -> test gate passes
    - Edge case 1: removed coverage option remains configured -> coverage command fails
    - Edge case 2: coverage is silently weakened or disabled -> verification fails

**Run:** First extend and run one-time exact target-matrix tests so they fail against the old matrix. Then apply only the controlled manifest and lockfile changes needed to activate the target package matrix, without production compatibility edits. After the landing proof passes, keep the ongoing `npm run verify:policy` gate focused on durable exact-pin and package/lockfile consistency invariants instead of freezing the original target versions forever. After that, execute the narrowest affected existing test or build command and confirm any compatibility failure is captured before production code changes begin.
**Expect:** FAIL (red) if compatibility fallout exists; otherwise record the passing narrow check as evidence that no production change is needed.

#### Step 3.2: Implement minimal code

Create the reviewed target lockfile, finalize `.npmrc` with exactly `save-exact=true`, `engine-strict=true`, and numeric `min-release-age=7`, prove the approved package target matrix landed, and update only the compatibility surfaces proven by failing tests or compile errors after the controlled dependency-change setup. Preserve route behavior, response shape, CORS policy, rate-limit registration, Flickr request construction, and photo mapping.

#### Step 3.3: Verify test passes

**Run:** Execute the same narrow affected test or build command used in Step 3.1.
**Expect:** PASS (green)

#### Step 3.4: Aggressive refactor

- Remove compatibility code that is no longer needed after the upgraded libraries are active.
- Prefer adjusting tests around observable behavior over coupling them to changed library internals.
- Delete obsolete coverage configuration options instead of replacing them with equivalent noise.
- Reduce production changes to the smallest surface that keeps the public API contract stable.

#### Step 3.5: Manual verification

Run the service with the upgraded runtime when credentials and environment values are available. Exercise `GET /photos/:albumId` with valid, empty-page, invalid-page, and service-error scenarios. Confirm behavior matches the pre-upgrade contract. Confirm the express-rate-limit v8 IPv6 `/56` default remains acceptable behind Fly/trust-proxy settings, or capture a failing test before changing rate-limit configuration.

### Acceptance criteria

- [ ] Express 5, middleware, Vitest 4, TypeScript 6, and related target packages are active.
- [ ] `package.json` and `package-lock.json` match the exact approved dependency matrix from the spec as one-time landing proof, while the ongoing policy enforces exact pins and lockfile consistency without freezing original package versions against legitimate future Dependabot updates.
- [ ] `.npmrc` is finalized with exactly `save-exact=true`, `engine-strict=true`, and numeric `min-release-age=7` after the reviewed target lockfile exists.
- [ ] `npm ci` passes against the reviewed target lockfile after release-age policy is enabled.
- [ ] Existing public API behavior is preserved.
- [ ] express-rate-limit v8 IPv6 `/56` grouping and Fly/trust-proxy behavior are explicitly verified as acceptable or changed only after a failing test proves the need.
- [ ] Vitest coverage remains meaningful and is not weakened.
- [ ] TypeScript config preserves explicit module, target, root directory, and strict settings.
- [ ] Any production code change is backed by a failing test or compiler error first.

---

## Phase 4: CI Baseline Before Deploy

**User stories**: 11, 12, 13, 14, 15

### What to build

Move remote validation to the same frozen baseline maintainers run locally. Pull requests and `main` should use the reviewed lockfile, audit signatures, high-severity vulnerability audit, wrapper format/build/test gates, and only deploy after those gates pass.

CI status contract:

| Gate                              | Machine-queryable context/check name |
| --------------------------------- | ------------------------------------ |
| Install                           | `ci/install`                         |
| Audit signatures                  | `ci/audit-signatures`                |
| High-severity vulnerability audit | `ci/audit-vulnerabilities`           |
| Format                            | `ci/format`                          |
| Build                             | `ci/build`                           |
| Test and coverage                 | `ci/test-coverage`                   |

#### Step 4.1: Write failing test

- Workflow validation
  - Verifier logic tests
    - Happy path: representative CI workflow fixtures with valid triggers, install, action refs, audits, wrapper gates, deploy ordering, and status names pass -> verifier tests pass
    - Edge case 1: a fixture with `npm install`, missing PR trigger, missing audit, missing wrapper gate, wrong action ref, or ambiguous status contract fails for the expected reason -> verifier tests pass
    - Edge case 2: workflow checks rely only on manual review and have no focused verifier coverage -> verification fails
  - Trigger behavior
    - Happy path: pull requests and `main` pushes run CI -> workflow definition passes validation
    - Edge case 1: pull requests do not trigger CI -> validation fails
    - Edge case 2: `main` deploys without prior gates -> validation fails
    - Edge case 3: pull request workflow attempts Fly deployment or requires Fly deployment secrets -> validation fails
  - Install behavior
    - Happy path: CI uses `npm ci` against the reviewed lockfile -> validation passes
    - Edge case 1: CI uses `npm install` -> validation fails
    - Edge case 2: CI does not set up Node from the project runtime contract -> validation fails
    - Edge case 3: CI does not ensure npm `11.13.0` -> validation fails
  - Baseline behavior
    - Happy path: CI runs audit signatures, high-severity audit, format, build, and test gates before deploy -> validation passes
    - Edge case 1: signature audit is missing -> validation fails
    - Edge case 2: high-severity audit is missing -> validation fails
    - Edge case 3: a wrapper gate is missing -> validation fails
  - Status contract
    - Happy path: CI exposes the exact current-head GitHub check runs or commit statuses from the CI status contract table -> automerge can query them separately
    - Edge case 1: checks are only anonymous steps inside one job with no machine-queryable status contract -> validation fails
    - Edge case 2: check names are not documented in the CI status contract table -> validation fails
  - Action refs
    - Happy path: workflow initially uses `actions/checkout@v6`, `actions/setup-node@v6`, and `superfly/flyctl-actions/setup-flyctl@v1` as one-time landing proof -> validation passes
    - Edge case 1: workflow uses floating, untracked, or initially wrong action refs during landing proof -> validation fails
    - Edge case 2: ongoing policy gate rejects a legitimate future GitHub Actions Dependabot version update solely because an action ref differs from the original landing matrix -> validation fails

**Run:** Execute the repository policy verifier's workflow validation or the narrowest static CI-policy check first, then confirm it fails against the current push-only, Node 22, `npm install` workflow.
**Expect:** FAIL (red)

#### Step 4.2: Implement minimal code

Update CI to install from the reviewed lockfile, run the audit and wrapper gates on pull requests and `main`, expose stable current-head checks for automerge, and leave Fly deployment only on `main` pushes after all gates pass. Prove the initial action refs match the spec matrix, while keeping the ongoing policy focused on tracked, non-floating action refs rather than freezing the original refs forever.

#### Step 4.3: Verify test passes

**Run:** Execute the same narrow workflow validation or static CI-policy check used in Step 4.1.
**Expect:** PASS (green)

#### Step 4.4: Aggressive refactor

- Remove duplicated CI setup steps.
- Prefer stable named checks over job complexity, but do not collapse checks in a way that makes automerge status verification ambiguous.
- Keep deployment logic after validation and avoid adding new deployment behavior.
- Use tracked major action refs so Dependabot can maintain action updates.

#### Step 4.5: Manual verification

Inspect the workflow and confirm pull requests and `main` both run `npm ci`, `npm audit signatures`, `npm audit --audit-level=high`, `./run.sh format`, `./run.sh build`, and `./run.sh test`. Confirm pull requests run validation only and do not require Fly deploy secrets. Confirm Fly deployment runs only for `main` pushes after all gates pass. Confirm the workflow exposes the exact separately queryable GitHub check runs or commit statuses from the CI status contract table. If a test pull request can be opened, confirm the checks run before merge eligibility.

### Acceptance criteria

- [ ] CI runs on pull requests and `main`.
- [ ] Pull requests run validation only and do not attempt Fly deployment.
- [ ] CI uses `npm ci`.
- [ ] CI sets up Node from the project runtime contract and ensures npm `11.13.0`.
- [ ] CI runs signature audit, high-severity audit, format, build, and test gates.
- [ ] CI exposes stable, separately queryable current-head GitHub check runs or commit statuses named `ci/install`, `ci/audit-signatures`, `ci/audit-vulnerabilities`, `ci/format`, `ci/build`, and `ci/test-coverage`.
- [ ] CI action refs initially use `actions/checkout@v6`, `actions/setup-node@v6`, and `superfly/flyctl-actions/setup-flyctl@v1`, and the ongoing policy rejects floating/untracked refs without freezing those initial refs against legitimate future Dependabot updates.
- [ ] Fly deployment runs only for `main` pushes after validation gates.

---

## Phase 5: Reproducible Docker Runtime

**User stories**: 18

### What to build

Pin the production container to the reviewed Node 24 Alpine digest while preserving the existing container behavior: frozen install, TypeScript build, development dependency pruning, port `3000`, and starting the compiled API.

#### Step 5.1: Write failing test

- Dockerfile validation
  - Verifier logic tests
    - Happy path: representative Dockerfile fixtures for the pinned base, frozen install, build, prune, exposed port, and start path pass -> verifier tests pass
    - Edge case 1: mutable base, Node 22 base, wrong digest, `npm install`, missing build, missing prune, or wrong start fixture fails for the expected reason -> verifier tests pass
    - Edge case 2: Dockerfile validation only inspects the live file and has no focused verifier coverage -> verification fails
  - Base image
    - Happy path: base image initially is `node:24.16.0-alpine` pinned to the specified digest as one-time landing proof -> validation passes
    - Edge case 1: base image is mutable without digest -> validation fails
    - Edge case 2: base image is still Node 22 -> validation fails
    - Edge case 3: digest differs from the spec matrix during initial landing proof -> validation fails
    - Edge case 4: ongoing policy gate rejects a legitimate future Dependabot Docker digest or tag update solely because it differs from the original landing matrix -> validation fails
  - Build path
    - Happy path: container install uses `npm ci`, builds TypeScript, prunes development dependencies, exposes port `3000`, and starts the compiled service -> validation passes
    - Edge case 1: container uses `npm install` -> validation fails
    - Edge case 2: runtime image skips TypeScript build output -> validation fails
    - Edge case 3: runtime start path no longer launches the compiled API -> validation fails
- Container runtime
  - Version check
    - Happy path: built image reports Node `v24.16.0` and npm `11.13.0` -> verification passes
    - Edge case 1: Node version differs -> verification fails
    - Edge case 2: npm version differs -> verification fails

**Run:** Execute the repository policy verifier's Docker validation or the narrowest Dockerfile validation first, then confirm it fails against the current Node 22 base.
**Expect:** FAIL (red)

#### Step 5.2: Implement minimal code

Update the container base to the spec digest and keep the existing build, prune, exposed port, and compiled-service start behavior. Prove the initial digest matches the spec matrix, while keeping the ongoing policy focused on digest-pinned base-image shape and runtime-contract safety rather than freezing the original digest forever.

#### Step 5.3: Verify test passes

**Run:** Execute the same narrow Dockerfile validation used in Step 5.1.
**Expect:** PASS (green)

#### Step 5.4: Aggressive refactor

- Remove stale comments or Docker stages that no longer serve the Node 24 path.
- Keep multi-stage Docker behavior simple and aligned with CI.
- Avoid changing service startup semantics beyond the spec requirement.

#### Step 5.5: Manual verification

When Docker is available, run `rtk docker build -t flickr-service:node24 .`, `rtk docker run --rm flickr-service:node24 node --version`, and `rtk docker run --rm flickr-service:node24 npm --version`. Confirm Node is `v24.16.0`, npm is `11.13.0`, and the image still exposes port `3000` and starts the compiled API.

### Acceptance criteria

- [ ] Docker base image is initially pinned to the specified Node `24.16.0` Alpine digest, and the ongoing policy requires digest-pinned Docker base shape without freezing the original digest against legitimate future Dependabot refreshes.
- [ ] Docker install uses `npm ci`.
- [ ] Docker build still compiles TypeScript and prunes development dependencies for runtime.
- [ ] Container runtime reports Node `v24.16.0` and npm `11.13.0` when Docker is available.

---

## Phase 6: Dependabot Update Policy

**User stories**: 19, 20, 21, 22

### What to build

Enable automated update discovery for npm, Docker, and GitHub Actions with a uniform 7-day cooldown. Keep this phase focused on runnable Dependabot intake and Docker digest coverage; npm and Docker major-update automerge blocking is enforced when the automerge workflow is built in Phase 7.

#### Step 6.1: Write failing test

- Dependabot ecosystem coverage
  - Verifier logic tests
    - Happy path: representative Dependabot fixtures for npm, Docker, GitHub Actions, required fields, cooldown, and Docker digest coverage pass -> verifier tests pass
    - Edge case 1: missing ecosystem, missing required field, missing cooldown, wrong cooldown, or missing Docker digest coverage fixture fails for the expected reason -> verifier tests pass
    - Edge case 2: Dependabot validation only inspects the live file and has no focused verifier coverage -> verification fails
  - Update sources
    - Happy path: npm, Docker, and GitHub Actions ecosystems are configured -> validation passes
    - Edge case 1: npm ecosystem is missing -> validation fails
    - Edge case 2: Docker ecosystem is missing -> validation fails
    - Edge case 3: GitHub Actions ecosystem is missing -> validation fails
  - Required config fields
    - Happy path: configuration has `version: 2`, each update entry has `package-ecosystem`, `directory: "/"`, and `schedule.interval` -> validation passes
    - Edge case 1: `version: 2` is missing -> validation fails
    - Edge case 2: an update entry omits `package-ecosystem` -> validation fails
    - Edge case 3: npm, Docker, or GitHub Actions entry has a `directory` other than `/` -> validation fails
    - Edge case 4: an update entry omits `schedule.interval` -> validation fails
  - Cooldown
    - Happy path: every ecosystem has `cooldown.default-days: 7` -> validation passes
    - Edge case 1: an ecosystem omits cooldown -> validation fails
    - Edge case 2: cooldown differs from 7 days -> validation fails
  - Docker digest maintenance
    - Happy path: Docker updates include digest refresh coverage -> validation passes
    - Edge case 1: Docker digest pinning is not tracked by Dependabot -> validation fails

**Run:** Execute the repository policy verifier's Dependabot validation or the narrowest Dependabot configuration validation first, then confirm it fails because Dependabot is not configured.
**Expect:** FAIL (red)

#### Step 6.2: Implement minimal code

Add Dependabot update intake for npm, Docker, and GitHub Actions with the 7-day cooldown and update policy needed for later safe automerge.

#### Step 6.3: Verify test passes

**Run:** Execute the same narrow Dependabot configuration validation used in Step 6.1.
**Expect:** PASS (green)

#### Step 6.4: Aggressive refactor

- Keep Dependabot entries concise and consistent across ecosystems.
- Avoid grouping or scheduling complexity unless it is required to express the spec.
- Do not add security-update exceptions that are outside the spec.

#### Step 6.5: Manual verification

Inspect Dependabot configuration and confirm npm, Docker, and GitHub Actions are covered at `directory: "/"`; every ecosystem has `schedule.interval` and a 7-day cooldown; and Docker digest updates are tracked.

### Acceptance criteria

- [ ] Dependabot covers npm, Docker, and GitHub Actions.
- [ ] Dependabot config is runnable with `version: 2`, required `package-ecosystem`, `directory: "/"`, and `schedule.interval` fields for every ecosystem.
- [ ] Every ecosystem has `cooldown.default-days: 7`.
- [ ] Docker digest refreshes are covered.

---

## Phase 7: Safe Dependabot Automerge

**User stories**: 23, 24, 25, 26

### What to build

Allow only approved low-risk Dependabot updates to enable GitHub auto-merge after the current pull request head has passed the full baseline. Privileged automation must never check out or execute Dependabot PR code.

#### Step 7.1: Write failing test

- Automerge eligibility
  - Verifier logic tests
    - Happy path: representative automerge workflow fixtures for allowed Dependabot patch/minor updates, blocked npm/Docker major updates, GitHub Actions updates, commit-status metadata retrieval, post-CI re-evaluation, current-head checks, no checkout, minimal permissions, and stale-head protection pass -> verifier tests pass
    - Edge case 1: major npm/Docker update, missing current-head check, stale head, branch-protection-only proof, checkout under elevated permissions, wrong action ref, or missing stale-head protection fixture fails for the expected reason -> verifier tests pass
    - Edge case 2: automerge validation only inspects the live workflow and has no focused verifier coverage -> verification fails
  - Executable automerge decision logic
    - Happy path: focused pass/fail tests exercise the same decision logic used by the workflow, whether extracted into a tiny helper or covered through a shell/`gh`/`jq` harness with representative inputs -> tests pass
    - Edge case 1: metadata parsing, update-type eligibility, current-head status aggregation, stale-head merge command construction, and block/allow decisions are only checked by static YAML text fixtures -> verification fails
    - Edge case 2: malformed metadata, unknown update type, missing status, stale head, wrong SHA, failed CI, non-Dependabot author, or unsupported ecosystem input returns deny-by-default -> tests pass
    - Edge case 3: allowed npm/Docker patch/minor and GitHub Actions version-update inputs with all exact current-head CI statuses successful return allow with the verified `--match-head-commit` SHA -> tests pass
  - npm and Docker updates
    - Happy path: `version-update:semver-patch` with green current-head baseline -> auto-merge can be enabled
    - Happy path: `version-update:semver-minor` with green current-head baseline -> auto-merge can be enabled
    - Edge case 1: `version-update:semver-major` -> auto-merge is blocked
    - Edge case 2: baseline is missing or failing -> auto-merge is blocked
    - Edge case 3: `security-update:*` metadata -> auto-merge is blocked
    - Edge case 4: unsupported or unknown Dependabot metadata type -> auto-merge is blocked
  - GitHub Actions updates
    - Happy path: `version-update:*` with green current-head baseline -> auto-merge can be enabled
    - Edge case 1: baseline is missing or failing -> auto-merge is blocked
    - Edge case 2: `security-update:*` metadata -> auto-merge is blocked
    - Edge case 3: unsupported or unknown Dependabot metadata type -> auto-merge is blocked
  - Dependabot identity
    - Happy path: pull request is from Dependabot -> workflow can evaluate metadata
    - Edge case 1: pull request is not from Dependabot -> workflow exits without enabling auto-merge
  - Post-CI re-evaluation
    - Happy path: automerge evaluation reruns safely after the completed baseline CI workflow succeeds, maps to exactly one open Dependabot pull request, resolves the current `PR.head.sha` from the pull request API, re-queries metadata and current checks for that resolved head SHA, and only then enables auto-merge -> validation passes
    - Edge case 1: automerge only runs before CI can turn green -> validation fails
    - Edge case 2: post-CI trigger cannot map the completed workflow run back to a Dependabot pull request and current head SHA -> validation fails
    - Edge case 3: completed baseline CI conclusion is not successful -> auto-merge is blocked
    - Edge case 4: completed workflow run maps to zero or multiple open pull requests -> auto-merge is blocked
    - Edge case 5: mapped pull request author is not `dependabot[bot]` -> auto-merge is blocked
    - Edge case 6: workflow assumes `workflow_run.head_sha` is the pull request head SHA instead of resolving the current `PR.head.sha` from the mapped pull request -> validation fails
    - Edge case 7: checks exist only on the pull request merge SHA or another wrong SHA, not on the resolved current `PR.head.sha` -> auto-merge is blocked
  - Dependabot metadata
    - Happy path: a no-checkout Dependabot metadata job uses `pull_request_target` for `opened`, `reopened`, and `synchronize`, gates to `dependabot[bot]`, uses `dependabot/fetch-metadata@v3`, and writes one data-only commit status with `context: dependabot/metadata`, `state: success`, and compact JSON in `description` on the PR head SHA; the post-CI workflow reads that status before classifying update type -> validation passes
    - Edge case 1: post-CI path cannot obtain Dependabot update metadata for npm, Docker, and GitHub Actions PRs from the `dependabot/metadata` status on the resolved current `PR.head.sha` -> auto-merge is blocked
    - Edge case 2: metadata status is missing, malformed, stale, conflicting, non-deterministic at the latest status for the exact SHA/context, or not on the resolved current `PR.head.sha` -> auto-merge is blocked; ordinary prior statuses for the same SHA/context are allowed when the latest status is unambiguous
    - Edge case 3: workflow assumes metadata from an unsupported `workflow_run` payload shape -> validation fails
    - Edge case 4: workflow checks out or executes PR code while producing metadata -> validation fails
    - Edge case 5: workflow introduces additional marketplace actions for metadata handoff -> validation fails
    - Edge case 6: metadata status `description` is not exactly a compact JSON object with `ecosystem`, `directory`, and `updateType` string fields, or exceeds the GitHub status description limit -> auto-merge is blocked
  - Privileged workflow safety
    - Workflow permissions
      - Happy path: metadata job declares exactly `pull-requests: read` and `statuses: write`; post-CI automerge job declares exactly `contents: write`, `pull-requests: write`, `checks: read`, and `statuses: read` -> validation passes
      - Edge case 1: permissions are missing and rely on broad defaults -> validation fails
      - Edge case 2: permissions include write scopes unrelated to reading metadata/statuses/checks or enabling pull request auto-merge -> validation fails
      - Edge case 3: required read permission for check/status verification is missing -> validation fails
    - Elevated permissions
      - Happy path: workflow uses metadata and status APIs without checking out or executing PR code -> validation passes
      - Unhappy path: workflow checks out PR code under elevated permissions -> validation fails
  - Current-head status proof
    - Happy path: the stable CI checks from Phase 4 for install, audit signatures, high-severity audit, format, build, and test/coverage are successful for the resolved current `PR.head.sha` -> auto-merge can be enabled
    - Edge case 1: status belongs to a stale head -> auto-merge is blocked
    - Edge case 2: workflow relies only on branch protection without checking current-head statuses -> validation fails
    - Edge case 3: workflow does not consume exactly the Phase 4 CI status contract names -> validation fails
    - Edge case 4: checks exist only on `workflow_run.head_sha`, the pull request merge SHA, or another wrong SHA while missing from the resolved current `PR.head.sha` -> auto-merge is blocked
  - Stale-head protection
    - Happy path: auto-merge command uses `gh pr merge "$PR_NUMBER" --auto --match-head-commit "$HEAD_SHA"` or an exact approved equivalent, where `$HEAD_SHA` is the verified current PR head SHA -> validation passes
    - Edge case 1: auto-merge command omits `--auto` -> validation fails
    - Edge case 2: auto-merge command omits stale-head protection -> validation fails
  - Action refs
    - Happy path: workflow initially uses `dependabot/fetch-metadata@v3` as one-time landing proof -> validation passes
    - Edge case 1: workflow uses a floating, untracked, or initially wrong metadata action ref during landing proof -> validation fails
    - Edge case 2: ongoing policy gate rejects a legitimate future GitHub Actions Dependabot version update solely because the metadata action ref differs from the original landing matrix -> validation fails

**Run:** Execute the repository policy verifier's automerge validation or the narrowest automerge workflow validation first, then confirm it fails because safe automerge is not configured.
**Expect:** FAIL (red)

#### Step 7.2: Implement minimal code

Add the Dependabot automerge workflow so a no-checkout metadata job uses `pull_request_target` for `opened`, `reopened`, and `synchronize`, gates to `dependabot[bot]`, initially uses `dependabot/fetch-metadata@v3`, and writes one data-only commit status with `context: dependabot/metadata` and `state: success` on the PR head SHA. Encode only compact JSON with `ecosystem`, `directory`, and `updateType` string fields in the status `description`, and fail if the JSON cannot fit the GitHub status description limit. Put the load-bearing automerge decision logic behind focused tests: either extract a tiny helper or provide a test harness around the same inline shell/`gh`/`jq` logic the workflow runs. Static workflow-shape fixtures alone are not enough for metadata parsing, update-type eligibility, current-head status aggregation, stale-head protection, or deny-by-default decisions. The post-CI automerge path treats `workflow_run` as a wake-up signal, maps the completed baseline CI run to exactly one open Dependabot pull request, resolves the current `PR.head.sha` from the pull request API, reads the latest unambiguous `dependabot/metadata` status from that resolved head SHA, treats ordinary prior statuses for the same SHA/context as allowed history when the latest status is unambiguous, checks allowed update classes, reruns safely after successful baseline CI completion, re-queries the full current-head CI baseline on the resolved head SHA using the exact check names from Phase 4, and enables GitHub auto-merge with `gh pr merge "$PR_NUMBER" --auto --match-head-commit "$HEAD_SHA"` or an exact approved equivalent, where `$HEAD_SHA` is the same resolved current PR head SHA. Prove the initial metadata action ref matches the spec matrix, while keeping the ongoing policy focused on tracked, non-floating action refs. Repository auto-merge and required-check settings are confirmed as final evidence and block implementation if unavailable.

#### Step 7.3: Verify test passes

**Run:** Execute the same narrow automerge workflow validation used in Step 7.1.
**Expect:** PASS (green)

#### Step 7.4: Aggressive refactor

- Keep privileged workflow logic short and auditable.
- Reuse CI status names from the baseline workflow instead of duplicating validation logic.
- Remove any checkout or script execution step from the automerge workflow.
- Prefer explicit blocked cases over broad allow-list shortcuts.

#### Step 7.5: Manual verification

Inspect the automerge workflow and confirm it only mutates pull requests after mapping an event to exactly one open Dependabot pull request, resolving the current `PR.head.sha` from the pull request API, obtaining Dependabot update metadata from the latest unambiguous `dependabot/metadata` commit status on that resolved head SHA, reading compact JSON from the status `description` field within the GitHub status description limit, treating ordinary prior statuses for the same SHA/context as allowed history when the latest status is unambiguous, rerunning safely after successful baseline CI completion, not trusting `workflow_run.head_sha` as the PR head SHA, not accepting checks that exist only on a pull request merge SHA or another wrong SHA, not checking out or executing PR code, declaring exactly the approved job-level permissions, blocking npm/Docker major updates, permitting only npm/Docker `version-update:semver-patch` and `version-update:semver-minor` after green CI, blocking npm/Docker `security-update:*` and unsupported or unknown metadata types, permitting only GitHub Actions `version-update:*` metadata after green CI, blocking GitHub Actions `security-update:*` and unsupported or unknown metadata types, verifying the exact current-head statuses from the Phase 4 table, and using `gh pr merge "$PR_NUMBER" --auto --match-head-commit "$HEAD_SHA"` or an exact approved equivalent with the resolved current PR head SHA. Confirm any unmapped, non-Dependabot, stale-head, failed-CI, metadata-missing, or ambiguous event exits without enabling auto-merge.

### Acceptance criteria

- [ ] Automerge runs only for Dependabot pull requests.
- [ ] Privileged workflow code does not check out or execute PR code.
- [ ] npm and Docker automerge allows only `version-update:semver-patch` and `version-update:semver-minor` after full green CI.
- [ ] npm and Docker major updates require manual review.
- [ ] npm and Docker `security-update:*`, unsupported, and unknown Dependabot metadata types are blocked from automerge.
- [ ] GitHub Actions automerge allows only `version-update:*` metadata after full green CI.
- [ ] GitHub Actions `security-update:*`, unsupported, and unknown Dependabot metadata types are blocked from automerge.
- [ ] Automerge evaluation reruns safely after successful baseline CI completion, maps to exactly one open Dependabot pull request, resolves the current `PR.head.sha` from the pull request API, and re-queries metadata plus current checks for that resolved head SHA before enabling auto-merge.
- [ ] Current-head status verification is present and auto-merge uses `gh pr merge "$PR_NUMBER" --auto --match-head-commit "$HEAD_SHA"` or an exact approved equivalent, where `$HEAD_SHA` is the verified current PR head SHA.
- [ ] Automerge workflow initially uses `dependabot/fetch-metadata@v3`, and the ongoing policy rejects floating/untracked metadata action refs without freezing that initial ref against legitimate future Dependabot updates.
- [ ] Executable automerge decision logic has focused pass/fail tests covering metadata parsing, update-type eligibility, current-head status aggregation, stale-head protection, deny-by-default blocks, and allowed green-current-head cases; static workflow-shape checks alone are insufficient.
- [ ] Metadata job uses `pull_request_target` for `opened`, `reopened`, and `synchronize`, gates to `dependabot[bot]`, writes one data-only commit status with `context: dependabot/metadata`, `state: success`, and compact JSON in `description` on the PR head SHA using `dependabot/fetch-metadata@v3`, and post-CI automerge reads the latest unambiguous status from the resolved current `PR.head.sha`.
- [ ] `dependabot/metadata` status `description` is exactly compact JSON with `ecosystem`, `directory`, and `updateType` string fields, fits the GitHub status description limit, and treats ordinary prior statuses for the same SHA/context as allowed history when the latest status is unambiguous.
- [ ] Metadata job declares exactly `pull-requests: read` and `statuses: write`; post-CI automerge job declares exactly `contents: write`, `pull-requests: write`, `checks: read`, and `statuses: read`.
- [ ] Missing required-check or GitHub auto-merge repository settings stop implementation until owner action resolves them.

---

## Phase 8: Final Evidence And Cleanup

**User stories**: 32

### What to build

Prove the completed dependency-management system with the agreed final verification commands and remove only temporary scaffolding that was introduced during implementation. This phase must not add deletion-enforcement tests; dependency removals and policy enforcement are verified in the earlier phases where those behaviors are built.

#### Step 8.1: Verify final evidence state

- Final verification evidence
  - Local install and wrapper gates
    - Happy path: `npm ci`, format, build, and test gates all pass -> final evidence is complete
    - Edge case 1: any wrapper gate fails -> final evidence fails
    - Edge case 2: policy verifier is not included in the test gate -> final evidence fails
  - Audit evidence
    - Happy path: npm audit signatures and high-severity audit pass -> final evidence is complete
    - Edge case 1: signature audit fails -> final evidence fails
    - Edge case 2: high or critical vulnerability is reported -> final evidence fails
  - Outdated dependency evidence
    - Happy path: no outdated direct dependency is reported except packages intentionally removed or updates blocked by release-age or cooldown policy -> final evidence is complete
    - Edge case 1: an unexpected outdated direct dependency remains -> final evidence fails
  - Docker evidence
    - Happy path: Docker build and container version checks pass when Docker is available -> final evidence is complete
    - Edge case 1: Docker is unavailable -> record the limitation explicitly instead of silently skipping it
    - Edge case 2: container Node or npm version differs from the spec -> final evidence fails

**Run:** Execute the narrowest final evidence command that is not yet green. Do not invent a new failing test for this phase.
**Expect:** PASS if all earlier slices are complete. If a command fails, treat that specific failure as the red signal, fix it minimally, and rerun the same command.

#### Step 8.2: Implement minimal code

Fix only issues revealed by the final evidence commands or remove temporary scaffolding introduced during the implementation. Do not add cleanup-only deletion-enforcement tests in this phase.

#### Step 8.3: Verify test passes

**Run:** Execute the same final evidence command used in Step 8.1.
**Expect:** PASS (green)

#### Step 8.4: Aggressive refactor

- Remove temporary scripts, fixtures, or comments used only to get through earlier red phases.
- Prefer shortening existing verification code over adding final-phase checks.
- Keep deletion and dependency-surface enforcement in the policy verifier from Phase 2, not in new cleanup tests.
- Re-run the complete final verification set after refactoring.

#### Step 8.5: Manual verification

Run `rtk npm ci`, `rtk ./run.sh format`, `rtk ./run.sh build`, `rtk ./run.sh test`, `rtk npm audit signatures`, `rtk npm audit --audit-level=high`, and `rtk npm outdated --json`. When Docker is available, run `rtk docker build -t flickr-service:node24 .`, `rtk docker run --rm flickr-service:node24 node --version`, and `rtk docker run --rm flickr-service:node24 npm --version`. Record whether GitHub auto-merge is enabled and whether required checks exactly match the Phase 4 status contract. If required checks or GitHub auto-merge repository settings cannot be confirmed, stop and request owner action rather than recording the issue as a follow-up.

### Acceptance criteria

- [ ] `rtk npm ci` passes.
- [ ] `rtk ./run.sh format` passes.
- [ ] `rtk ./run.sh build` passes.
- [ ] `rtk ./run.sh test` passes.
- [ ] `rtk npm audit signatures` passes.
- [ ] `rtk npm audit --audit-level=high` passes.
- [ ] `rtk npm outdated --json` shows no unexpected outdated direct dependencies.
- [ ] Docker build and container version checks pass when Docker is available, or the Docker limitation is explicitly documented.
- [ ] Final evidence records whether GitHub auto-merge is enabled and whether required checks exactly match `ci/install`, `ci/audit-signatures`, `ci/audit-vulnerabilities`, `ci/format`, `ci/build`, and `ci/test-coverage`; if not confirmable, implementation is blocked pending owner action.
