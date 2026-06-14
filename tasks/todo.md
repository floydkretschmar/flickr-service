# Patch Management And Dependency Upgrade Tasks

**Branch:** feature/patch-management-dependency-upgrade
**Scheme:** docs/schemes/2026-06-13-patch-management-dependency-upgrade.md
**Spec:** docs/specs/2026-06-13-patch-management-dependency-upgrade.md

## Current Direction

The custom repository dependency-policy verifier has been removed by owner request. Version and configuration drift is no longer enforced by `scripts/verify-dependency-policy.mjs`, `npm run verify:policy`, or the `./run.sh test` gate.

The maintained baseline is:
- `./run.sh test` runs coverage.
- `./run.sh format` runs the maintained-file Prettier check.
- `./run.sh build` runs the TypeScript build.
- CI runs install, audit-signature, vulnerability-audit, format, build, and test/coverage checks.
- Dependabot tracks npm, Docker, and GitHub Actions updates.
- Safe Dependabot automerge workflow remains in place and checks the required CI contexts before enabling auto-merge.

## Acceptance Criteria

- [x] Remove `scripts/verify-dependency-policy.mjs`.
- [x] Remove `src/tests/verifyDependencyPolicy.test.ts`.
- [x] Remove `verify:policy` from `package.json`.
- [x] Remove the policy verifier from `./run.sh test`.
- [x] Keep CI using the normal wrapper gates without the custom verifier.
- [x] Update project documentation to describe the version table as a baseline, not strict custom enforcement.
- [ ] Final verification evidence is green for `rtk npm ci`, `rtk ./run.sh format`, `rtk ./run.sh build`, `rtk ./run.sh test`, `rtk npm audit signatures --min-release-age=0`, and `rtk npm audit --audit-level=high`.
- [ ] Docker final verification is run when Docker is available.
- [ ] GitHub required checks are configured on `main` for `ci/install`, `ci/audit-signatures`, `ci/audit-vulnerabilities`, `ci/format`, `ci/build`, and `ci/test-coverage`.

## Evidence

Before the verifier removal, local evidence under Node `24.16.0`/npm `11.13.0` passed for install, format, build, test, signature audit with `--min-release-age=0`, high-severity audit, and `npm outdated --json`. Docker build and container version checks could not run because the Docker daemon was unavailable.

Authenticated GitHub checks confirmed repository auto-merge was initially disabled, `main` had no classic branch protection, and no repository rulesets existed. Auto-merge has since been enabled by the owner; required checks still need to be configured after GitHub observes the check names from a workflow run.
