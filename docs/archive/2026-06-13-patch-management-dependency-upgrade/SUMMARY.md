# Patch Management And Dependency Upgrade

## Summary

Built a maintainable dependency-management baseline for the Flickr service: Node 24/npm 11 runtime metadata, real local wrapper gates, upgraded package matrix, CI install/audit/format/build/test checks, Docker digest pinning, Dependabot intake, and safe Dependabot automerge. The custom dependency-policy verifier that landed during implementation was later removed by owner request so future version movement is governed by Dependabot and normal CI gates rather than a repo-specific strict checker.

## Key Decisions

- Runtime baseline: The project records Node `24.16.0` and npm `11.13.0` in runtime metadata and documentation so local, CI, and Docker expectations are clear.
- CI contract: Pull requests and `main` expose six stable checks: `ci/install`, `ci/audit-signatures`, `ci/audit-vulnerabilities`, `ci/format`, `ci/build`, and `ci/test-coverage`.
- Safe automerge: Dependabot automerge never checks out PR code; it reads metadata and current-head checks through GitHub APIs, then uses `--match-head-commit`.
- No custom verifier: The repository does not keep `scripts/verify-dependency-policy.mjs` or `npm run verify:policy`; strict version enforcement was removed in favor of standard gates and Dependabot.

## Patterns Established

- Wrapper gates: `./run.sh test`, `./run.sh format`, and `./run.sh build` are the developer-facing validation commands.
- Audit gates: CI uses `npm audit signatures --min-release-age=0` and `npm audit --audit-level=high`.
- Dependabot metadata handoff: The automerge workflow uses a compact `dependabot/metadata` commit status to classify updates without executing PR code.
- Branch protection: `main` requires the six CI checks and has repository auto-merge enabled.

## Files

- Implementation: `run.sh`, `package.json`, `package-lock.json`, `.nvmrc`, `.npmrc`, `Dockerfile`
- Tests: `src/tests/runWrapper.test.ts`, existing API/service/server tests
- Config: `.github/workflows/pipeline.yml`, `.github/workflows/dependabot-automerge.yml`, `.github/dependabot.yml`, `fly.toml`
- Documentation: `docs/PROJECT.md`

## Future Considerations

- Docker final evidence should be rerun on a machine with a reachable Docker daemon.
- Required check names must stay aligned between branch protection and `.github/workflows/pipeline.yml`.
- If merge queue is enabled later, CI should be updated for `merge_group` before relying on it.
