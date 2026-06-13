# Patch Management And Dependency Upgrade Tasks

**Branch:** feature/patch-management-dependency-upgrade
**Scheme:** docs/schemes/2026-06-13-patch-management-dependency-upgrade.md
**Spec:** docs/specs/2026-06-13-patch-management-dependency-upgrade.md

## Acceptance Criteria

- [x] `./run.sh test` runs `npm run verify:policy` and `npm run coverage` after the policy verifier is introduced.
- [x] `./run.sh format` checks maintained project files.
- [x] `./run.sh build` runs the TypeScript build.
- [ ] Local, CI, and Docker runtime targets use Node `24.16.0` and npm `11.13.0`.
- [x] `.nvmrc` is exactly `24.16.0`.
- [x] `package.json` declares `engines.node` and `packageManager`.
- [x] `.npmrc` enforces exact saves, strict engines, and numeric 7-day release age.
- [x] Final `.npmrc` contains exactly `save-exact=true`, `engine-strict=true`, and `min-release-age=7` with no contradictory or additional install-policy keys.
- [x] `min-release-age=7` is enabled only after the reviewed target lockfile exists.
- [ ] CI uses `npm ci`, runs on pull requests, and runs the same baseline developers run.
- [ ] Pull requests run validation only and do not attempt Fly deployment.
- [ ] CI checks npm audit signatures and high-severity vulnerability audit.
- [ ] CI exposes stable, separately queryable current-head GitHub check runs or commit statuses named `ci/install`, `ci/audit-signatures`, `ci/audit-vulnerabilities`, `ci/format`, `ci/build`, and `ci/test-coverage`.
- [ ] Workflow action refs initially use `actions/checkout@v6`, `actions/setup-node@v6`, `superfly/flyctl-actions/setup-flyctl@v1`, and `dependabot/fetch-metadata@v3` where applicable, and the ongoing policy rejects floating/untracked refs without freezing those initial refs against legitimate future Dependabot updates.
- [x] Direct dependencies are exact pins and unused direct dependencies are removed after usage checks.
- [x] `package.json` and `package-lock.json` match the exact approved dependency matrix from the spec as one-time landing proof, while the ongoing policy enforces exact pins and lockfile consistency without freezing original package versions against legitimate future Dependabot updates.
- [ ] The repository policy verifier has focused pass/fail tests for runtime, dependency pins, npm policy, CI, Docker, Dependabot, and automerge rules.
- [x] The ongoing policy verifier enforces durable invariants without hard-coding the original package, Docker digest/tag, or action target matrix as permanent CI blockers for future valid Dependabot updates.
- [x] Phase 2 live validation enforces only Phase 2-owned live files and uses fixtures or documentation-presence checks for later CI, Docker, Dependabot, and automerge surfaces until those phases activate live validation.
- [x] `scripts/verify-dependency-policy.mjs` has public-entrypoint coverage through `npm run verify:policy`.
- [x] `npm run verify:policy` is wired into `./run.sh test` and fails before runtime/dependency metadata changes make it pass.
- [ ] Docker base image is pinned by digest and tracked by Dependabot.
- [ ] Dependabot updates npm, Docker, and GitHub Actions with a 7-day cooldown.
- [ ] Dependabot config is runnable with `version: 2`, required `package-ecosystem`, `directory: "/"`, and `schedule.interval` fields.
- [ ] npm and Docker automerge allows only `version-update:semver-patch` and `version-update:semver-minor` after green CI; major, `security-update:*`, unsupported, and unknown metadata types are blocked.
- [ ] GitHub Actions automerge allows only `version-update:*` metadata after green CI; `security-update:*`, unsupported, and unknown metadata types are blocked.
- [ ] Dependabot automerge does not check out or execute PR code with elevated permissions.
- [ ] Dependabot automerge evaluation reruns safely after successful baseline CI completion, maps to exactly one open Dependabot pull request, resolves the current `PR.head.sha` from the pull request API, and re-queries metadata plus current checks for that resolved head SHA.
- [ ] Dependabot metadata job uses `pull_request_target` for `opened`, `reopened`, and `synchronize`, gates to `dependabot[bot]`, writes one data-only commit status with `context: dependabot/metadata`, `state: success`, and compact JSON in `description` on the PR head SHA using `dependabot/fetch-metadata@v3`, and post-CI automerge reads the latest unambiguous status from the resolved current `PR.head.sha`.
- [ ] `dependabot/metadata` status `description` is exactly compact JSON with `ecosystem`, `directory`, and `updateType` string fields, fits the GitHub status description limit, and treats ordinary prior statuses for the same SHA/context as allowed history when the latest status is unambiguous.
- [ ] Dependabot metadata job declares exactly `pull-requests: read` and `statuses: write`; post-CI automerge job declares exactly `contents: write`, `pull-requests: write`, `checks: read`, and `statuses: read`.
- [ ] Dependabot automerge uses `gh pr merge "$PR_NUMBER" --auto --match-head-commit "$HEAD_SHA"` or an exact approved equivalent, where `$HEAD_SHA` is the verified current PR head SHA.
- [ ] Executable automerge decision logic has focused pass/fail tests covering metadata parsing, update-type eligibility, current-head status aggregation, stale-head protection, deny-by-default blocks, and allowed green-current-head cases; static workflow-shape checks alone are insufficient.
- [x] Mutable bootstrap installs are pinned.
- [x] The exact version matrix is documented in `docs/PROJECT.md` as maintainer-facing landing evidence.
- [x] Express 5, Vitest 4, and TypeScript 6 fallout is handled with tests and minimal compatibility changes.
- [x] express-rate-limit v8 IPv6 `/56` grouping and Fly/trust-proxy behavior are explicitly verified as acceptable or changed only after a failing test proves the need.
- [ ] Final verification evidence is green for `rtk npm ci`, `rtk ./run.sh format`, `rtk ./run.sh build`, `rtk ./run.sh test`, `rtk npm audit signatures`, and `rtk npm audit --audit-level=high`.
- [ ] Docker final verification is run when Docker is available.
- [ ] Final evidence records whether GitHub auto-merge is enabled and whether required checks exactly match the Phase 4 status contract; if not confirmable, implementation is blocked pending owner action.
- [ ] Cleanup/final evidence does not add cleanup-only deletion-enforcement tests.

## Phases

- [x] Phase 1: Real Local Validation Gates
- [x] Phase 2: Runtime And Dependency Policy Contract
- [x] Phase 3: Minimal Toolchain And Package Upgrade
- [ ] Phase 4: CI Baseline Before Deploy
- [ ] Phase 5: Reproducible Docker Runtime
- [ ] Phase 6: Dependabot Update Policy
- [ ] Phase 7: Safe Dependabot Automerge
- [ ] Phase 8: Final Evidence And Cleanup
- [ ] Final verification

## TDD Slice Log (Required)

- [x] Slice 1: Real local validation gates
  - RED command + failure: `rtk npm test -- --run src/tests/runWrapper.test.ts` failed because `run.sh` placeholder `test`, `format`, and `build` commands did not invoke npm, and `package.json` had no maintained-file `format` script. After the approved unmatched-glob adjustment, the same command briefly failed because the test still expected the old Prettier command without `--no-error-on-unmatched-pattern`.
  - GREEN command + pass: `rtk npm test -- --run src/tests/runWrapper.test.ts` passed after wiring `./run.sh test` to `npm run coverage`, `./run.sh format` to `npm run format`, `./run.sh build` to `npm run build`, and updating the package `format` script to the approved maintained-file Prettier scope with `--no-error-on-unmatched-pattern`. Baseline verification also passed: `rtk ./run.sh test`, `rtk ./run.sh format`, and `rtk ./run.sh build`.
  - Review addendum RED/GREEN: `rtk rg -n 'placeholders|placeholder|test.*format.*build.*placeholders' docs/PROJECT.md` first found stale placeholder wording in the `run.sh` module summary. After updating that summary to describe the real wrapper gates, the same stale-text check found no matches; baseline verification passed again with `rtk ./run.sh test`, `rtk ./run.sh format`, and `rtk ./run.sh build`.
- [x] Slice 2: Runtime and dependency policy contract
  - RED command + failure: `rtk npm test -- --run src/tests/verifyDependencyPolicy.test.ts` failed because `scripts/verify-dependency-policy.mjs` did not exist. `rtk npm test -- --run src/tests/runWrapper.test.ts` then failed because `./run.sh test` ran only `npm run coverage`, not `npm run verify:policy` first. After adding the verifier/script wiring but before metadata changes, `rtk npm run verify:policy` failed against Node 22 metadata, missing package manager and npm policy, ranged direct dependencies, unused direct dependencies, and missing version-matrix docs.
  - GREEN command + pass: `rtk npm test -- --run src/tests/verifyDependencyPolicy.test.ts`, `rtk npm test -- --run src/tests/runWrapper.test.ts`, and `rtk npm run verify:policy` passed after adding the Phase 2 verifier, focused fixture coverage, public script wiring, exact current direct pins, `.nvmrc`/package metadata, `.npmrc` exact-save and strict-engine policy, pinned bootstrap installs, and `docs/PROJECT.md` landing evidence. Baseline verification passed with `rtk ./run.sh test`, `rtk ./run.sh format`, and `rtk ./run.sh build`.
  - Review addendum RED/GREEN: `rtk npm test -- --run src/tests/verifyDependencyPolicy.test.ts` first failed after adding documentation coverage because dependency names without exact versions still passed; the same command then failed after adding CLI fixture coverage because `scripts/verify-dependency-policy.mjs <root>` ignored the fixture root and exited `0`. After tightening `docs/PROJECT.md` verification to require exact `name@version` entries and teaching the CLI entrypoint to accept a repository root, `rtk npm test -- --run src/tests/verifyDependencyPolicy.test.ts` passed with focused fixture mutations for `engines.node`, `packageManager`, ranged direct dependencies, removed direct dependencies, package-lock/package.json drift, and the CLI path. A second review addendum RED proved `.npmrc` with `save-exact=true`, `engine-strict=true`, then `save-exact=false` incorrectly passed; after requiring each Phase 2 npm policy key exactly once with the expected value, the same command passed with 14 tests. A third review addendum RED proved a valid future exact `cors` update in `package.json` and the lockfile root failed because the verifier required stale docs to document `cors@2.8.6`; after moving dependency landing evidence to verifier-owned Phase 2 constants instead of deriving it from live `package.json`, the same command passed with 15 tests. A fourth review addendum RED proved `docs/PROJECT.md` evidence of `cors@2.8.50` incorrectly satisfied required `cors@2.8.5` landing evidence; after replacing loose substring evidence with bounded token matching, the same command passed with 16 tests while preserving valid future package and lockfile updates with historical docs. A fifth review addendum RED proved comment-only bootstrap pin tokens incorrectly passed when `run.sh` used `refs/heads/master` and unpinned `context-mode` commands with `# v0.42.4` and `# context-mode@1.0.162` comments; after verifying non-comment bootstrap command shapes for the pinned RTK installer and exact `npm install -g context-mode@1.0.162`, the same command passed with 17 tests. A sixth review addendum RED proved stale direct package entries incorrectly passed when `package.json` and the lockfile root updated `cors` to `2.8.6` while `packages["node_modules/cors"].version` stayed `2.8.5`; after requiring each direct dependency and devDependency to match its `node_modules/<name>` package entry version, the same command passed with 18 tests while preserving valid future package and lockfile updates that update both root and package entries. A seventh review addendum RED proved a stale removed `packages["node_modules/express-validator"]` lockfile entry incorrectly passed after `package.json` no longer listed it; after rejecting removed dependency package paths in `package-lock.json`, the same command passed with 19 tests, and the refactor rerun also passed with 19 tests. An eighth review addendum RED proved reordered `package-lock.json` root `dependencies` and `devDependencies` incorrectly failed with root drift errors; after comparing root maps by exact key/value entries instead of insertion-order serialization, the same command passed with 20 tests, and the refactor rerun also passed with 20 tests.
- [x] Slice 3: Minimal toolchain and package upgrade
  - RED command + failure: `rtk node --input-type=module -e "import { verifyPackageTargetMatrix } from './scripts/verify-dependency-policy.mjs'; const { errors } = verifyPackageTargetMatrix(); if (errors.length) { console.error(errors.join('\n')); process.exit(1); }"` failed against the old Phase 2 package matrix, reporting the approved Phase 3 target versions for `cors`, `dotenv`, `express`, `express-rate-limit`, `@types/express`, `@types/node`, `@vitest/coverage-v8`, `prettier`, `typescript`, and `vitest`. `rtk npm test -- --run src/tests/verifyDependencyPolicy.test.ts` also failed before implementation when the one-time Phase 3 package target verifier did not exist, then failed again when the live verifier still rejected final `min-release-age=7` policy. After the dependency upgrade, `rtk npm test -- --run src/tests/controllers.test.ts src/tests/server.test.ts src/tests/flickrService.test.ts src/tests/photoService.test.ts` failed under Vitest 4 because `vi.restoreAllMocks()` left shared `getPhotos` call history in the invalid-page controller test.
  - GREEN command + pass: Under Node `24.16.0` and npm `11.13.0`, `rtk npm ci` passed against the reviewed target lockfile after `.npmrc` was finalized with exactly `save-exact=true`, `engine-strict=true`, and `min-release-age=7`. The one-time package target proof passed with `verifyPackageTargetMatrix()`, while `rtk npm run verify:policy` remained durable for future exact dependency movement. The same affected API/middleware command passed after changing the Vitest teardown to `vi.clearAllMocks()`, with no production code changes. Refactor proof and baseline verification passed with `rtk npm test -- --run src/tests/verifyDependencyPolicy.test.ts src/tests/server.test.ts`, `rtk ./run.sh test`, `rtk ./run.sh format`, and `rtk ./run.sh build`.
- [ ] Slice 4: CI baseline before deploy
  - RED command + failure:
  - GREEN command + pass:
- [ ] Slice 5: Reproducible Docker runtime
  - RED command + failure:
  - GREEN command + pass:
- [ ] Slice 6: Dependabot update policy
  - RED command + failure:
  - GREEN command + pass:
- [ ] Slice 7: Safe Dependabot automerge
  - RED command + failure:
  - GREEN command + pass:
- [ ] Slice 8: Final evidence and cleanup
  - RED command + failure:
  - GREEN command + pass:

## Working Notes

[Empty - filled during implementation]

## Results

Phase 1 complete. Automated verification passed for `rtk ./run.sh test`, `rtk ./run.sh format`, and `rtk ./run.sh build`.

Phase 2 complete. Automated verification passed for `rtk ./run.sh test`, `rtk ./run.sh format`, and `rtk ./run.sh build`. Live `min-release-age=7`, Phase 3 dependency target upgrades, CI, Docker, Dependabot, and automerge live surfaces remain deferred to their approved later phases.

Phase 3 complete. Automated verification passed for `rtk npm ci`, `rtk ./run.sh test`, `rtk ./run.sh format`, and `rtk ./run.sh build` under Node `24.16.0`/npm `11.13.0`. CI, Docker, Dependabot, automerge, audit-signature, and high-severity audit work remain deferred to their approved later phases.
