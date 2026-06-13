# Patch Management And Dependency Upgrade Tasks

**Branch:** feature/patch-management-dependency-upgrade
**Scheme:** docs/schemes/2026-06-13-patch-management-dependency-upgrade.md
**Spec:** docs/specs/2026-06-13-patch-management-dependency-upgrade.md

## Acceptance Criteria

- [ ] `./run.sh test` runs `npm run verify:policy` and `npm run coverage` after the policy verifier is introduced.
- [x] `./run.sh format` checks maintained project files.
- [x] `./run.sh build` runs the TypeScript build.
- [ ] Local, CI, and Docker runtime targets use Node `24.16.0` and npm `11.13.0`.
- [ ] `.nvmrc` is exactly `24.16.0`.
- [ ] `package.json` declares `engines.node` and `packageManager`.
- [ ] `.npmrc` enforces exact saves, strict engines, and numeric 7-day release age.
- [ ] Final `.npmrc` contains exactly `save-exact=true`, `engine-strict=true`, and `min-release-age=7` with no contradictory or additional install-policy keys.
- [ ] `min-release-age=7` is enabled only after the reviewed target lockfile exists.
- [ ] CI uses `npm ci`, runs on pull requests, and runs the same baseline developers run.
- [ ] Pull requests run validation only and do not attempt Fly deployment.
- [ ] CI checks npm audit signatures and high-severity vulnerability audit.
- [ ] CI exposes stable, separately queryable current-head GitHub check runs or commit statuses named `ci/install`, `ci/audit-signatures`, `ci/audit-vulnerabilities`, `ci/format`, `ci/build`, and `ci/test-coverage`.
- [ ] Workflow action refs initially use `actions/checkout@v6`, `actions/setup-node@v6`, `superfly/flyctl-actions/setup-flyctl@v1`, and `dependabot/fetch-metadata@v3` where applicable, and the ongoing policy rejects floating/untracked refs without freezing those initial refs against legitimate future Dependabot updates.
- [ ] Direct dependencies are exact pins and unused direct dependencies are removed after usage checks.
- [ ] `package.json` and `package-lock.json` match the exact approved dependency matrix from the spec as one-time landing proof, while the ongoing policy enforces exact pins and lockfile consistency without freezing original package versions against legitimate future Dependabot updates.
- [ ] The repository policy verifier has focused pass/fail tests for runtime, dependency pins, npm policy, CI, Docker, Dependabot, and automerge rules.
- [ ] The ongoing policy verifier enforces durable invariants without hard-coding the original package, Docker digest/tag, or action target matrix as permanent CI blockers for future valid Dependabot updates.
- [ ] Phase 2 live validation enforces only Phase 2-owned live files and uses fixtures or documentation-presence checks for later CI, Docker, Dependabot, and automerge surfaces until those phases activate live validation.
- [ ] `scripts/verify-dependency-policy.mjs` has public-entrypoint coverage through `npm run verify:policy`.
- [ ] `npm run verify:policy` is wired into `./run.sh test` and fails before runtime/dependency metadata changes make it pass.
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
- [ ] Mutable bootstrap installs are pinned.
- [ ] The exact version matrix is documented in `docs/PROJECT.md` as maintainer-facing landing evidence.
- [ ] Express 5, Vitest 4, and TypeScript 6 fallout is handled with tests and minimal compatibility changes.
- [ ] express-rate-limit v8 IPv6 `/56` grouping and Fly/trust-proxy behavior are explicitly verified as acceptable or changed only after a failing test proves the need.
- [ ] Final verification evidence is green for `rtk npm ci`, `rtk ./run.sh format`, `rtk ./run.sh build`, `rtk ./run.sh test`, `rtk npm audit signatures`, and `rtk npm audit --audit-level=high`.
- [ ] Docker final verification is run when Docker is available.
- [ ] Final evidence records whether GitHub auto-merge is enabled and whether required checks exactly match the Phase 4 status contract; if not confirmable, implementation is blocked pending owner action.
- [ ] Cleanup/final evidence does not add cleanup-only deletion-enforcement tests.

## Phases

- [x] Phase 1: Real Local Validation Gates
- [ ] Phase 2: Runtime And Dependency Policy Contract
- [ ] Phase 3: Minimal Toolchain And Package Upgrade
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
- [ ] Slice 2: Runtime and dependency policy contract
  - RED command + failure:
  - GREEN command + pass:
- [ ] Slice 3: Minimal toolchain and package upgrade
  - RED command + failure:
  - GREEN command + pass:
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
