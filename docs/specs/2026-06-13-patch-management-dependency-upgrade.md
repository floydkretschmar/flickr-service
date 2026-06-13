# Patch Management And Dependency Upgrade

## Problem Statement

The service currently lacks a reliable patch-management contract. The project is pinned to Node 22 in `.nvmrc`, Docker, and GitHub Actions, while the local environment may use a different runtime. Direct npm dependencies use caret ranges, `package.json` has no runtime or package-manager enforcement, CI uses `npm install`, and `run.sh` declares required validation targets that are currently placeholders.

This makes dependency updates difficult to trust. A future upgrade can pass locally while using the wrong Node/npm pair, mutate the lockfile unexpectedly, install a package version published minutes earlier, or merge Dependabot changes without proving the same baseline that developers are expected to run.

The refactor must establish a strict, repeatable dependency-management system before upgrading packages.

## Solution

Create one explicit dependency and runtime contract for the API:

- Use Node `24.16.0` LTS and npm `11.13.0`.
- Pin all direct npm dependencies exactly. Do not use `^`, `~`, ranges, or `@latest` in `package.json`.
- Remove unused direct dependencies instead of upgrading them.
- Make `./run.sh test`, `./run.sh format`, and `./run.sh build` real validation gates before any runtime or dependency upgrade.
- Add npm and Dependabot release-age delays to reduce day-one supply-chain risk.
- Modernize CI around `npm ci` and require the full baseline before deploy or automerge.
- Add Dependabot for npm, Docker, and GitHub Actions.
- Allow automerge only after CI passes.

The refactor should change production application code only where required by Node 24, Express 5, TypeScript 6, Vitest 4, or middleware compatibility.

## User Stories

1. As a service maintainer, I want `./run.sh test` to execute real tests, so that the required project validation is meaningful.
2. As a service maintainer, I want `./run.sh format` to check maintained project files, so that formatting drift is caught before review.
3. As a service maintainer, I want `./run.sh build` to run the TypeScript build, so that compile errors block completion.
4. As a service maintainer, I want the project to use Node `24.16.0` LTS everywhere, so that local, CI, and Docker behavior align.
5. As a service maintainer, I want npm pinned to `11.13.0`, so that lockfile behavior is repeatable.
6. As a service maintainer, I want `package.json` to declare the Node engine, so that unsupported runtimes fail early.
7. As a service maintainer, I want `package.json` to declare `packageManager`, so that tooling drift is visible.
8. As a service maintainer, I want `.npmrc` to enforce exact saves, so that future direct dependencies are not added with ranges.
9. As a service maintainer, I want `.npmrc` to enforce strict engines, so that installs fail on the wrong Node version.
10. As a service maintainer, I want `.npmrc` to delay newly published npm packages by 7 days, so that day-one supply-chain risk is reduced.
11. As a service maintainer, I want CI to use `npm ci`, so that CI installs exactly the reviewed lockfile.
12. As a service maintainer, I want CI to run on pull requests, so that Dependabot automerge cannot happen without PR validation.
13. As a service maintainer, I want CI to run the same baseline developers run, so that local and remote signals match.
14. As a service maintainer, I want CI to check npm audit signatures, so that package signature/provenance failures block merges.
15. As a service maintainer, I want CI to run npm audit with a high-severity threshold, so that high and critical vulnerabilities block merges.
16. As a service maintainer, I want direct dependency versions pinned exactly, so that package upgrades are intentional reviewed diffs.
17. As a service maintainer, I want unused direct dependencies removed, so that the dependency surface is smaller.
18. As a service maintainer, I want the Docker base image pinned by digest, so that container builds are reproducible.
19. As a service maintainer, I want Dependabot to refresh Docker digests, so that digest pinning does not freeze security patches forever.
20. As a service maintainer, I want Dependabot to update npm dependencies, so that patch and minor upgrades arrive automatically.
21. As a service maintainer, I want Dependabot to update GitHub Actions, so that workflow actions stay current.
22. As a service maintainer, I want Dependabot cooldown set to 7 days, so that automated version updates wait before opening PRs.
23. As a service maintainer, I want npm and Docker patch/minor updates automerged after green CI, so that low-risk updates do not wait for manual intervention.
24. As a service maintainer, I want npm and Docker major updates to require manual review, so that breaking changes are not silently merged.
25. As a service maintainer, I want GitHub Actions version updates automerged after green CI, so that workflow maintenance stays low-friction.
26. As a service maintainer, I want Dependabot automerge to avoid checking out PR code, so that the automerge workflow does not run untrusted code with elevated permissions.
27. As a service maintainer, I want mutable bootstrap installs pinned, so that developer setup does not pull arbitrary future installer state.
28. As a service maintainer, I want the exact version matrix documented, so that implementation does not guess target versions.
29. As a service maintainer, I want Express 5 migration fallout handled with tests, so that API behavior remains stable.
30. As a service maintainer, I want Vitest 4 coverage changes revalidated, so that coverage reports remain meaningful.
31. As a service maintainer, I want TypeScript 6 config changes handled explicitly, so that compiler defaults do not surprise the project.
32. As a service maintainer, I want final verification evidence from the project wrapper, so that done means the agreed gates are green.

## Implementation Decisions

### Step 0: Make Baseline Commands Real

This must happen before runtime or dependency changes.

- Add a `format` script to `package.json`.
- Add a small policy verifier script at `scripts/verify-dependency-policy.mjs`.
- `./run.sh test` must run `npm run verify:policy` and `npm run coverage`.
- `./run.sh format` must run the Prettier check.
- `./run.sh build` must run `npm run build`.

The Prettier check must cover maintained project files and must not format local Codex skill/plugin internals. Use this exact maintained-file scope unless implementation discovers a repository file that must be added:

```sh
prettier --check "src/**/*.ts" "docs/**/*.md" ".github/**/*.yml" ".github/**/*.yaml" "package.json" "package-lock.json" "tsconfig.json"
```

The policy verifier must fail if any of the following are false:

- `engines.node` is exactly `24.16.0`.
- `packageManager` is exactly `npm@11.13.0`.
- Every direct dependency and dev dependency has an exact version.
- `express-validator` is not present in direct dependencies.
- `@flydotio/dockerfile` is not present in direct dev dependencies.
- `.npmrc` contains `save-exact=true`, `engine-strict=true`, and `min-release-age=7` after the bootstrap sequence is complete.

### Runtime And Tooling Matrix

| Item                     |                                                                                        Target |
| ------------------------ | --------------------------------------------------------------------------------------------: |
| Node                     |                                                                                     `24.16.0` |
| npm                      |                                                                                     `11.13.0` |
| `packageManager`         |                                                                                 `npm@11.13.0` |
| `engines.node`           |                                                                                     `24.16.0` |
| `.nvmrc`                 |                                                                                     `24.16.0` |
| Docker base              | `node:24.16.0-alpine@sha256:fb71d01345f11b708a3553c66e7c74074f2d506400ea81973343d915cb64eef0` |
| RTK bootstrap            |                                                                                     `v0.42.4` |
| `context-mode` bootstrap |                                                                                     `1.0.162` |

Node `24.16.0` metadata was verified from the official Node release index. It ships npm `11.13.0`, V8 `13.6.233.17`, OpenSSL `3.5.6`, and LTS codename `Krypton`.

### Dependency Matrix

All direct package versions must be exact string pins in `package.json`.

Production dependencies:

| Package              |   Target |
| -------------------- | -------: |
| `cors`               |  `2.8.6` |
| `dotenv`             | `17.4.2` |
| `express`            |  `5.2.1` |
| `express-rate-limit` |  `8.5.2` |
| `moment`             | `2.30.1` |
| `express-validator`  |   remove |

Development dependencies:

| Package                |    Target |
| ---------------------- | --------: |
| `@types/cors`          |  `2.8.19` |
| `@types/express`       |   `5.0.6` |
| `@types/node`          | `24.13.2` |
| `@vitest/coverage-v8`  |   `4.1.8` |
| `prettier`             |   `3.8.4` |
| `typescript`           |   `6.0.3` |
| `vitest`               |   `4.1.8` |
| `vitest-mock-express`  |   `2.2.0` |
| `@flydotio/dockerfile` |    remove |

`@types/node` must use the latest Node 24 type line, not the latest Node 25 type package. The verified latest Node 24 type package is `24.13.2`.

The implementation must confirm no source, test, script, or workflow usage before removing `express-validator` and `@flydotio/dockerfile`. If usage is discovered, implementation must stop and request a spec change instead of silently keeping or upgrading them.

### npm Policy

Add `.npmrc` with exactly:

```ini
save-exact=true
engine-strict=true
min-release-age=7
```

`min-release-age=7` is a number of days. Do not use `7d`.

Initial upgrade bootstrap rule:

1. Create the reviewed exact lockfile for the target matrix first.
2. Add or enable `.npmrc` with `min-release-age=7`.
3. Verify `npm ci` succeeds with the reviewed lockfile.
4. After `.npmrc` lands, do not bypass `min-release-age` for future npm resolution/update flows.

This bootstrap sequence is required because some target packages may be newer than 7 days at implementation time. `npm ci` remains the frozen lockfile install path.

### CI And GitHub Actions

Update CI so pull requests and `main` both run the full baseline.

Use tracked major action refs, with Dependabot responsible for keeping them current:

| Action                                 |  Ref |
| -------------------------------------- | ---: |
| `actions/checkout`                     | `v6` |
| `actions/setup-node`                   | `v6` |
| `superfly/flyctl-actions/setup-flyctl` | `v1` |
| `dependabot/fetch-metadata`            | `v3` |

Latest observed tags on 2026-06-13 were:

| Action                                 | Latest observed tag |
| -------------------------------------- | ------------------: |
| `actions/checkout`                     |            `v6.0.3` |
| `actions/setup-node`                   |            `v6.4.0` |
| `superfly/flyctl-actions/setup-flyctl` |              `v1.4` |
| `dependabot/fetch-metadata`            |            `v3.1.0` |

CI must:

1. Check out the repository.
2. Set up Node from `.nvmrc`.
3. Ensure npm is `11.13.0`.
4. Run `npm ci`.
5. Run `npm audit signatures`.
6. Run `npm audit --audit-level=high`.
7. Run `./run.sh format`.
8. Run `./run.sh build`.
9. Run `./run.sh test`.

Fly deployment must remain after all CI gates pass.

### Docker

Pin the Node Docker base image by digest:

```dockerfile
FROM node:24.16.0-alpine@sha256:fb71d01345f11b708a3553c66e7c74074f2d506400ea81973343d915cb64eef0 as base
```

The Dockerfile must continue to install with `npm ci`, build TypeScript, prune dev dependencies for the runtime image, expose port `3000`, and start `node build/index.js`.

Dependabot must track Docker updates so digest pinning remains fresh.

### Dependabot

Add `.github/dependabot.yml` covering:

- `npm`
- `docker`
- `github-actions`

Every ecosystem entry must include:

```yaml
cooldown:
  default-days: 7
```

Automerge policy:

- npm patch updates: automerge after CI/full baseline passes.
- npm minor updates: automerge after CI/full baseline passes.
- npm major updates: no automerge.
- Docker patch updates: automerge after CI/full baseline passes.
- Docker minor updates: automerge after CI/full baseline passes.
- Docker major updates: no automerge.
- GitHub Actions version updates: automerge after CI/full baseline passes for all update types.

No security-update exception is part of this spec. Dependabot configuration must include the 7-day cooldown for every configured ecosystem, and no dependency PR may automerge without the CI/full baseline gate.

### Dependabot Automerge Workflow

Add `.github/workflows/dependabot-automerge.yml`.

The workflow must:

- Run only for Dependabot pull requests.
- Use `pull_request_target` only if it does not check out or execute PR code.
- Use `dependabot/fetch-metadata@v3`.
- Allow npm and Docker automerge only for `version-update:semver-patch` and `version-update:semver-minor`.
- Allow GitHub Actions automerge for any version update type.
- Enable GitHub auto-merge with `gh pr merge --auto`.
- Include `--match-head-commit` or equivalent stale-head protection.
- Explicitly verify the full CI baseline is green for the current PR head before enabling auto-merge.

The automerge workflow must not rely only on branch protection as the proof that CI passed. It must check the current PR head has successful CI results for install, audit signatures, vulnerability audit, format, build, and test/coverage before calling `gh pr merge --auto`.

If the implementation cannot verify those statuses from the workflow, automerge is blocked and must not be enabled. Missing repository settings for GitHub auto-merge or required checks are blockers, not post-merge follow-up actions.

### Migration Notes

Node 22 to Node 24:

- Official migration notes call out OpenSSL 3.5 behavior. Weak keys and weak ciphers may fail.
- The service currently calls Flickr over HTTPS and should be tested against real dependencies only if credentials are available through the existing deployment/runtime path.

Express 4 to Express 5:

- Current route `/photos/:albumId` does not use wildcard or optional path syntax.
- Current response usage does not use removed `res.send(body, status)` style signatures.
- Express 5 may tighten request/response generics and async error behavior.

`express-rate-limit` 7 to 8:

- IPv6 users are grouped by `/56` subnet by default.
- The service currently relies on the default key behavior behind Fly/trust proxy. Verify rate-limit tests still describe intended behavior.

`dotenv` 16 to 17:

- `quiet` defaults changed and may add startup output.
- Configure quiet behavior explicitly if test or runtime logs become noisy.

Vitest 3 to 4:

- V8 coverage remapping changed.
- Removed options include `coverage.all`, `coverage.extensions`, `coverage.ignoreEmptyLines`, and `coverage.experimentalAstAwareRemapping`.
- The existing coverage config must be updated only where needed and revalidated.

TypeScript 5.8 to 6:

- TypeScript 6 changes compiler defaults.
- Keep `module: "nodenext"`, `target: "es2024"`, `rootDir: "src"`, and `strict: true` explicit.
- Add explicit `types` only if the TypeScript 6 migration requires it for Node or Vitest globals.

## Testing Decisions

The required final verification commands are:

```sh
rtk npm ci
rtk ./run.sh format
rtk ./run.sh build
rtk ./run.sh test
rtk npm audit signatures
rtk npm audit --audit-level=high
```

Because Docker is in scope, final verification must also run when Docker is available:

```sh
rtk docker build -t flickr-service:node24 .
rtk docker run --rm flickr-service:node24 node --version
rtk docker run --rm flickr-service:node24 npm --version
```

Expected container versions:

- Node: `v24.16.0`
- npm: `11.13.0`

Run `npm outdated --json` after the upgrade. The result must show no outdated direct dependencies except packages intentionally removed from `package.json` or future updates blocked by the 7-day release-age/cooldown policy.

If Express 5, TypeScript 6, Vitest 4, or middleware upgrades require production code changes, use TDD:

1. Show the failing test or compile error.
2. Make the smallest production change.
3. Re-run the affected test.
4. Refactor after green.
5. Re-run the full final verification set.

## Out of Scope

- Do not change public API behavior for `GET /photos/:albumId`.
- Do not change Flickr DTO mapping, date formatting, thumbnail fields, view-count behavior, or bucket URL behavior unless tests show an upgrade regression.
- Do not replace `moment` in this refactor.
- Do not add Renovate.
- Do not push, create a PR, or change repository settings without explicit user approval.
- Do not introduce authentication, secret, or production credential changes.
- Do not refactor environment parsing unless required by TypeScript 6 or Node 24 compatibility.
- Do not regenerate the Dockerfile from `@flydotio/dockerfile`; remove that package if it remains unused.

## Further Notes

Architecture synthesis:

- The conservative plan keeps production code changes near zero and separates baseline, runtime, dependency, CI, and automation phases.
- The runtime-first plan correctly requires PR CI before Dependabot automerge and warns that exact `engines.node: "24.16.0"` intentionally rejects later Node patches until reviewed.
- The automation-first plan contributes the policy verifier, audit/signature gates, Docker digest pinning, and the no-PR-code-execution automerge workflow.

The chosen approach combines those ideas: a small operational policy surface, strict exact pins, explicit runtime alignment, and automated updates only after the same full baseline goes green.

Primary sources consulted during planning:

- Node releases: https://nodejs.org/en/about/previous-releases
- Node v22 to v24 migration: https://nodejs.org/en/blog/migrations/v22-to-v24
- Express 5 migration: https://expressjs.com/en/guide/migrating-5.html
- express-rate-limit changelog: https://express-rate-limit.mintlify.app/reference/changelog
- Vitest migration: https://vitest.dev/guide/migration.html
- Vitest coverage: https://vitest.dev/guide/coverage.html
- TypeScript 6 release notes: https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html
- npm `ci`: https://docs.npmjs.com/cli/commands/npm-ci/
- npm config, including `min-release-age`: https://docs.npmjs.com/cli/v11/using-npm/config
- npm package lock: https://docs.npmjs.com/cli/v10/configuring-npm/package-lock-json/
- npm package metadata, including `engines` and `devEngines`: https://docs.npmjs.com/cli/v10/configuring-npm/package-json/
- Dependabot options, including `cooldown`: https://docs.github.com/en/code-security/reference/supply-chain-security/dependabot-options-reference
- Dependabot automation with Actions: https://docs.github.com/en/code-security/tutorials/secure-your-dependencies/automate-dependabot-with-actions
- Docker digest pinning: https://docs.docker.com/dhi/core-concepts/digests/
