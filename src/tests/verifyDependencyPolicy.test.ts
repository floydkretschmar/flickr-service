import { describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

import {
  verifyCiWorkflow,
  verifyDependabotAutomergeWorkflow,
  verifyDependabotConfig,
  verifyDependencyPolicy,
  verifyDockerfile,
  verifyFinalNpmPolicy,
  verifyPackageTargetMatrix,
} from "../../scripts/verify-dependency-policy.mjs";

function validRepository() {
  return {
    files: {
      ".codex/config.toml":
        'model = "gpt-5"\ncontext_mode_version = "1.0.162"\nrtk_version = "v0.42.4"\n',
      ".npmrc": "save-exact=true\nengine-strict=true\nmin-release-age=7\n",
      ".nvmrc": "24.16.0\n",
      "docs/PROJECT.md":
        "Node `24.16.0`, npm `11.13.0`, Docker base `node:24.16.0-alpine@sha256:fb71d01345f11b708a3553c66e7c74074f2d506400ea81973343d915cb64eef0`, RTK `v0.42.4`, context-mode `1.0.162`, `actions/checkout@v6`, `actions/setup-node@v6`, `superfly/flyctl-actions/setup-flyctl@v1`, `dependabot/fetch-metadata@v3`, `cors@2.8.6`, `dotenv@17.4.2`, `express@5.2.1`, `express-rate-limit@8.5.2`, `moment@2.30.1`, `@types/cors@2.8.19`, `@types/express@5.0.6`, `@types/node@24.13.2`, `@vitest/coverage-v8@4.1.8`, `prettier@3.8.4`, `typescript@6.0.3`, `vitest@4.1.8`, `vitest-mock-express@2.2.0`.",
      Dockerfile: validDockerfile(),
      ".github/dependabot.yml": validDependabotConfig(),
      ".github/workflows/dependabot-automerge.yml":
        validDependabotAutomergeWorkflow(),
      ".github/workflows/pipeline.yml": validCiWorkflow(),
      "package-lock.json": JSON.stringify({
        lockfileVersion: 3,
        packages: {
          "": {
            dependencies: {
              cors: "2.8.6",
              dotenv: "17.4.2",
              express: "5.2.1",
              "express-rate-limit": "8.5.2",
              moment: "2.30.1",
            },
            devDependencies: {
              "@types/cors": "2.8.19",
              "@types/express": "5.0.6",
              "@types/node": "24.13.2",
              "@vitest/coverage-v8": "4.1.8",
              prettier: "3.8.4",
              typescript: "6.0.3",
              vitest: "4.1.8",
              "vitest-mock-express": "2.2.0",
            },
          },
          "node_modules/@types/cors": { version: "2.8.19" },
          "node_modules/@types/express": { version: "5.0.6" },
          "node_modules/@types/node": { version: "24.13.2" },
          "node_modules/@vitest/coverage-v8": { version: "4.1.8" },
          "node_modules/cors": { version: "2.8.6" },
          "node_modules/dotenv": { version: "17.4.2" },
          "node_modules/express": { version: "5.2.1" },
          "node_modules/express-rate-limit": { version: "8.5.2" },
          "node_modules/moment": { version: "2.30.1" },
          "node_modules/prettier": { version: "3.8.4" },
          "node_modules/typescript": { version: "6.0.3" },
          "node_modules/vitest": { version: "4.1.8" },
          "node_modules/vitest-mock-express": { version: "2.2.0" },
        },
      }),
      "package.json": JSON.stringify({
        engines: { node: "24.16.0" },
        packageManager: "npm@11.13.0",
        dependencies: {
          cors: "2.8.6",
          dotenv: "17.4.2",
          express: "5.2.1",
          "express-rate-limit": "8.5.2",
          moment: "2.30.1",
        },
        devDependencies: {
          "@types/cors": "2.8.19",
          "@types/express": "5.0.6",
          "@types/node": "24.13.2",
          "@vitest/coverage-v8": "4.1.8",
          prettier: "3.8.4",
          typescript: "6.0.3",
          vitest: "4.1.8",
          "vitest-mock-express": "2.2.0",
        },
      }),
      "run.sh":
        "curl -fsSL https://raw.githubusercontent.com/rtk-ai/rtk/v0.42.4/install.sh | sh\nnpm install -g context-mode@1.0.162\n",
    },
  };
}

function validDependabotConfig() {
  return `version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    cooldown:
      default-days: 7

  - package-ecosystem: "docker"
    directory: "/"
    schedule:
      interval: "weekly"
    cooldown:
      default-days: 7

  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
    cooldown:
      default-days: 7
`;
}

function validDockerfile() {
  return `# syntax = docker/dockerfile:1

FROM node:24.16.0-alpine@sha256:fb71d01345f11b708a3553c66e7c74074f2d506400ea81973343d915cb64eef0 as base

WORKDIR /app
ENV NODE_ENV="production"

FROM base as build
COPY --link package-lock.json package.json ./
RUN npm ci --include=dev
COPY --link . .
RUN npm run build
RUN npm prune --omit=dev

FROM base
COPY --from=build /app /app
EXPOSE 3000
CMD [ "node", "build/index.js" ]
`;
}

function validCiWorkflow() {
  return `name: CI

on:
  pull_request:
  push:
    branches:
      - main

jobs:
  install:
    name: ci/install
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version-file: .nvmrc
      - run: npm install -g npm@11.13.0
      - run: npm ci

  audit-signatures:
    name: ci/audit-signatures
    runs-on: ubuntu-latest
    needs: install
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version-file: .nvmrc
      - run: npm install -g npm@11.13.0
      - run: npm ci
      - run: npm audit signatures --min-release-age=0

  audit-vulnerabilities:
    name: ci/audit-vulnerabilities
    runs-on: ubuntu-latest
    needs: install
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version-file: .nvmrc
      - run: npm install -g npm@11.13.0
      - run: npm ci
      - run: npm audit --audit-level=high

  format:
    name: ci/format
    runs-on: ubuntu-latest
    needs: install
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version-file: .nvmrc
      - run: npm install -g npm@11.13.0
      - run: npm ci
      - run: ./run.sh format

  build:
    name: ci/build
    runs-on: ubuntu-latest
    needs: install
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version-file: .nvmrc
      - run: npm install -g npm@11.13.0
      - run: npm ci
      - run: ./run.sh build

  test-coverage:
    name: ci/test-coverage
    runs-on: ubuntu-latest
    needs: install
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version-file: .nvmrc
      - run: npm install -g npm@11.13.0
      - run: npm ci
      - run: ./run.sh test

  deploy:
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    needs:
      - audit-signatures
      - audit-vulnerabilities
      - format
      - build
      - test-coverage
    steps:
      - uses: actions/checkout@v6
      - uses: superfly/flyctl-actions/setup-flyctl@v1
      - run: flyctl deploy -a flickr-service
        env:
          FLY_API_TOKEN: \${{ secrets.FLY_API_TOKEN }}
`;
}

function validDependabotAutomergeWorkflow() {
  return `name: Dependabot Automerge

on:
  pull_request_target:
    types:
      - opened
      - reopened
      - synchronize
  workflow_run:
    workflows:
      - CI
    types:
      - completed

jobs:
  metadata:
    if: github.event_name == 'pull_request_target' && github.actor == 'dependabot[bot]'
    runs-on: ubuntu-latest
    permissions:
      pull-requests: read
      statuses: write
    steps:
      - uses: dependabot/fetch-metadata@v3
        id: metadata
      - name: Write metadata status
        env:
          GH_TOKEN: \${{ github.token }}
          HEAD_SHA: \${{ github.event.pull_request.head.sha }}
          ECOSYSTEM: \${{ steps.metadata.outputs.package-ecosystem }}
          DIRECTORY: \${{ steps.metadata.outputs.directory }}
          UPDATE_TYPE: \${{ steps.metadata.outputs.update-type }}
        run: |
          DESCRIPTION="$(jq -cn --arg ecosystem "$ECOSYSTEM" --arg directory "$DIRECTORY" --arg updateType "$UPDATE_TYPE" '{ecosystem:$ecosystem,directory:$directory,updateType:$updateType}')"
          test "\${#DESCRIPTION}" -le 140
          gh api repos/\${{ github.repository }}/statuses/"$HEAD_SHA" -f state=success -f context=dependabot/metadata -f description="$DESCRIPTION"

  automerge:
    if: github.event_name == 'workflow_run' && github.event.workflow_run.conclusion == 'success'
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
      checks: read
      statuses: read
    steps:
      - name: Enable safe Dependabot auto-merge
        env:
          GH_TOKEN: \${{ github.token }}
        run: |
          REQUIRED_CHECKS='["ci/install","ci/audit-signatures","ci/audit-vulnerabilities","ci/format","ci/build","ci/test-coverage"]'
          PR_COUNT="$(jq '[.workflow_run.pull_requests[]? | select(.number != null)] | length' "$GITHUB_EVENT_PATH")"
          if [ "$PR_COUNT" -ne 1 ]; then exit 0; fi
          PR_NUMBER="$(jq -r '.workflow_run.pull_requests | map(select(.number != null)) | .[0].number' "$GITHUB_EVENT_PATH")"
          PR="$(gh api repos/\${{ github.repository }}/pulls/"$PR_NUMBER")"
          PR_AUTHOR="$(jq -r '.user.login // ""' <<<"$PR")"
          PR_STATE="$(jq -r '.state // ""' <<<"$PR")"
          if [ "$PR_AUTHOR" != "dependabot[bot]" ] || [ "$PR_STATE" != "open" ]; then exit 0; fi
          HEAD_SHA="$(jq -r '.head.sha // ""' <<<"$PR")"
          if [ -z "$HEAD_SHA" ]; then exit 0; fi
          STATUSES="$(gh api repos/\${{ github.repository }}/commits/"$HEAD_SHA"/statuses)"
          CHECKS="$(gh api repos/\${{ github.repository }}/commits/"$HEAD_SHA"/check-runs)"
          node --input-type=module - "$HEAD_SHA" "$STATUSES" "$CHECKS" "$REQUIRED_CHECKS" <<'NODE'
          const [headSha, statusesJson, checksJson, requiredChecksJson] = process.argv.slice(2);
          const statuses = JSON.parse(statusesJson);
          const checks = JSON.parse(checksJson).check_runs ?? [];
          const requiredChecks = JSON.parse(requiredChecksJson);
          const matchingStatuses = statuses
            .filter((status) => status.context === "dependabot/metadata")
            .map((status, index) => ({ ...status, index, timestamp: Date.parse(status.created_at ?? "") }));
          const finiteTimestamps = matchingStatuses.map((status) => status.timestamp).filter(Number.isFinite);
          const latestTimestamp = finiteTimestamps.length ? Math.max(...finiteTimestamps) : undefined;
          const latestStatuses = latestTimestamp === undefined
            ? matchingStatuses.slice(-1)
            : matchingStatuses.filter((status) => status.timestamp === latestTimestamp);
          const metadataStatus = latestStatuses.every((status) => status.state === latestStatuses[0]?.state && status.description === latestStatuses[0]?.description)
            ? latestStatuses[0]
            : undefined;
          if (!metadataStatus || metadataStatus.description.length > 140) process.exit(1);
          if (metadataStatus.state !== "success") process.exit(1);
          const metadata = JSON.parse(metadataStatus.description);
          if (metadataStatus.description !== JSON.stringify(metadata)) process.exit(1);
          const keys = Object.keys(metadata).sort().join(",");
          if (keys !== "directory,ecosystem,updateType") process.exit(1);
          if (!["ecosystem", "directory", "updateType"].every((key) => typeof metadata[key] === "string")) process.exit(1);
          if (metadata.updateType.startsWith("security-update:")) process.exit(1);
          const allowedNpmOrDocker = ["npm", "npm_and_yarn", "docker"].includes(metadata.ecosystem) && ["version-update:semver-patch", "version-update:semver-minor"].includes(metadata.updateType);
          const allowedActions = metadata.ecosystem === "github-actions" && metadata.updateType.startsWith("version-update:");
          if (!allowedNpmOrDocker && !allowedActions) process.exit(1);
          const greenChecks = new Set(checks.filter((check) => check.head_sha === headSha && check.conclusion === "success").map((check) => check.name));
          if (!requiredChecks.every((check) => greenChecks.has(check))) process.exit(1);
          NODE
          gh pr merge "$PR_NUMBER" --auto --match-head-commit "$HEAD_SHA"
`;
}

function mutateJson(
  repository: ReturnType<typeof validRepository>,
  path: string,
  mutate: (content: Record<string, any>) => void,
) {
  const content = JSON.parse(repository.files[path]);
  mutate(content);
  repository.files[path] = JSON.stringify(content);
}

async function writeRepositoryFixture(
  root: string,
  repository: ReturnType<typeof validRepository>,
) {
  for (const [path, content] of Object.entries(repository.files)) {
    await mkdir(join(root, path, ".."), { recursive: true });
    writeFileSync(join(root, path), content);
  }
}

function workflowNodeDecisionBlock(workflow: string) {
  const match = workflow.match(
    /node --input-type=module[\s\S]*?<<'NODE'\n([\s\S]*?)\n\s*NODE/,
  );
  if (!match) throw new Error("workflow inline Node decision block not found");
  return match[1].replace(/^ {10}/gm, "");
}

function runWorkflowDecision({
  statuses,
  checks,
}: {
  statuses: unknown[];
  checks: { name: string; conclusion?: string; head_sha?: string }[];
}) {
  return spawnSync(
    process.execPath,
    [
      "--input-type=module",
      "-",
      "head",
      JSON.stringify(statuses),
      JSON.stringify({ check_runs: checks }),
      JSON.stringify([
        "ci/install",
        "ci/audit-signatures",
        "ci/audit-vulnerabilities",
        "ci/format",
        "ci/build",
        "ci/test-coverage",
      ]),
    ],
    {
      encoding: "utf8",
      input: workflowNodeDecisionBlock(
        readFileSync(".github/workflows/dependabot-automerge.yml", "utf8"),
      ),
    },
  );
}

describe("dependency policy verifier", () => {
  it("accepts a repository that satisfies the Phase 3 runtime and dependency contract", () => {
    const result = verifyDependencyPolicy(validRepository());

    expect(result.errors).toEqual([]);
  });

  it("rejects dependency matrix documentation that omits exact current versions", () => {
    const repository = validRepository();
    repository.files["docs/PROJECT.md"] =
      "Node `24.16.0`, npm `11.13.0`, Docker base `node:24.16.0-alpine@sha256:fb71d01345f11b708a3553c66e7c74074f2d506400ea81973343d915cb64eef0`, RTK `v0.42.4`, context-mode `1.0.162`, `actions/checkout@v6`, `actions/setup-node@v6`, `superfly/flyctl-actions/setup-flyctl@v1`, `dependabot/fetch-metadata@v3`, `cors`, `dotenv`, `express`, `express-rate-limit`, `moment`, `@types/cors`, `@types/express`, `@types/node`, `@vitest/coverage-v8`, `prettier`, `typescript`, `vitest`, `vitest-mock-express`.";

    expect(verifyDependencyPolicy(repository).errors).toContain(
      "docs/PROJECT.md must document cors@2.8.6",
    );
  });

  it("rejects dependency matrix documentation with only a near-match version", () => {
    const repository = validRepository();
    repository.files["docs/PROJECT.md"] = repository.files[
      "docs/PROJECT.md"
    ].replace("`cors@2.8.6`", "`cors@2.8.60`");

    expect(verifyDependencyPolicy(repository).errors).toContain(
      "docs/PROJECT.md must document cors@2.8.6",
    );
  });

  it("accepts a future exact dependency update without changing package target landing docs", () => {
    const repository = validRepository();
    mutateJson(repository, "package.json", (packageJson) => {
      packageJson.dependencies.cors = "2.8.7";
    });
    mutateJson(repository, "package-lock.json", (lockfile) => {
      lockfile.packages[""].dependencies.cors = "2.8.7";
      lockfile.packages["node_modules/cors"].version = "2.8.7";
    });

    expect(verifyDependencyPolicy(repository).errors).toEqual([]);
  });

  it("accepts reordered package-lock root dependency metadata", () => {
    const repository = validRepository();
    mutateJson(repository, "package-lock.json", (lockfile) => {
      lockfile.packages[""].dependencies = {
        moment: "2.30.1",
        "express-rate-limit": "8.5.2",
        express: "5.2.1",
        dotenv: "17.4.2",
        cors: "2.8.6",
      };
      lockfile.packages[""].devDependencies = {
        "vitest-mock-express": "2.2.0",
        vitest: "4.1.8",
        typescript: "6.0.3",
        prettier: "3.8.4",
        "@vitest/coverage-v8": "4.1.8",
        "@types/node": "24.13.2",
        "@types/express": "5.0.6",
        "@types/cors": "2.8.19",
      };
    });

    expect(verifyDependencyPolicy(repository).errors).toEqual([]);
  });

  it("rejects bootstrap pins that appear only in comments", () => {
    const repository = validRepository();
    repository.files["run.sh"] =
      "curl -fsSL https://raw.githubusercontent.com/rtk-ai/rtk/refs/heads/master/install.sh | sh # v0.42.4\nnpm install -g context-mode # context-mode@1.0.162\n";

    expect(verifyDependencyPolicy(repository).errors).toEqual(
      expect.arrayContaining([
        "run.sh must install RTK from v0.42.4",
        "run.sh must install context-mode@1.0.162",
      ]),
    );
  });

  it("rejects an invalid repository through the CLI entrypoint", async () => {
    const root = mkdtempSync(join(tmpdir(), "dependency-policy-"));
    const repository = validRepository();
    mutateJson(repository, "package.json", (packageJson) => {
      packageJson.engines = { node: "22.0.0" };
    });
    await writeRepositoryFixture(root, repository);

    const result = spawnSync(
      process.execPath,
      ["scripts/verify-dependency-policy.mjs", root],
      { encoding: "utf8" },
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "package.json engines.node must be 24.16.0",
    );
  });

  it("rejects package.json engines.node drift", () => {
    const repository = validRepository();
    mutateJson(repository, "package.json", (packageJson) => {
      packageJson.engines = { node: "22.0.0" };
    });

    expect(verifyDependencyPolicy(repository).errors).toContain(
      "package.json engines.node must be 24.16.0",
    );
  });

  it("rejects packageManager drift", () => {
    const repository = validRepository();
    mutateJson(repository, "package.json", (packageJson) => {
      packageJson.packageManager = "npm@10.0.0";
    });

    expect(verifyDependencyPolicy(repository).errors).toContain(
      "package.json packageManager must be npm@11.13.0",
    );
  });

  it("rejects ranged direct dependency versions", () => {
    const repository = validRepository();
    mutateJson(repository, "package.json", (packageJson) => {
      packageJson.dependencies.express = "^4.21.2";
    });

    expect(verifyDependencyPolicy(repository).errors).toContain(
      "dependencies.express must use an exact version",
    );
  });

  it("rejects removed direct dependencies", () => {
    const repository = validRepository();
    mutateJson(repository, "package.json", (packageJson) => {
      packageJson.dependencies["express-validator"] = "7.2.1";
      packageJson.devDependencies["@flydotio/dockerfile"] = "0.7.10";
    });

    expect(verifyDependencyPolicy(repository).errors).toEqual(
      expect.arrayContaining([
        "express-validator must not be a direct dependency",
        "@flydotio/dockerfile must not be a direct dependency",
      ]),
    );
  });

  it("rejects removed dependency package entries in package-lock", () => {
    const repository = validRepository();
    mutateJson(repository, "package-lock.json", (lockfile) => {
      lockfile.packages["node_modules/express-validator"] = {
        version: "7.2.1",
      };
    });

    expect(verifyDependencyPolicy(repository).errors).toContain(
      "package-lock.json must not include node_modules/express-validator",
    );
  });

  it("rejects package-lock drift from package.json", () => {
    const repository = validRepository();
    mutateJson(repository, "package-lock.json", (lockfile) => {
      lockfile.packages[""].dependencies.express = "4.21.1";
    });

    expect(verifyDependencyPolicy(repository).errors).toContain(
      "package-lock.json root dependencies must match package.json",
    );
  });

  it("rejects stale direct dependency package entries in package-lock", () => {
    const repository = validRepository();
    mutateJson(repository, "package.json", (packageJson) => {
      packageJson.dependencies.cors = "2.8.6";
    });
    mutateJson(repository, "package-lock.json", (lockfile) => {
      lockfile.packages[""].dependencies.cors = "2.8.6";
      lockfile.packages["node_modules/cors"].version = "2.8.5";
    });

    expect(verifyDependencyPolicy(repository).errors).toContain(
      "package-lock.json package entry node_modules/cors version must match dependencies.cors",
    );
  });

  it.each([
    ["runtime", ".nvmrc", "22\n", ".nvmrc must be 24.16.0"],
    [
      "npm policy",
      ".npmrc",
      "save-exact=true\n",
      ".npmrc must document engine-strict=true",
    ],
    [
      "bootstrap pins",
      "run.sh",
      "npm install -g context-mode\n",
      "run.sh must install RTK from v0.42.4",
    ],
    [
      "landing documentation",
      "docs/PROJECT.md",
      "Node `24.16.0` and npm `11.13.0`.",
      "docs/PROJECT.md must document actions/checkout@v6",
    ],
  ])("rejects invalid %s metadata", (_, path, content, expectedError) => {
    const repository = validRepository();
    repository.files[path] = content;

    expect(verifyDependencyPolicy(repository).errors).toContain(expectedError);
  });

  it("rejects contradictory final npm policy assignments", () => {
    const repository = validRepository();
    repository.files[".npmrc"] =
      "save-exact=true\nengine-strict=true\nsave-exact=false\n";

    expect(verifyDependencyPolicy(repository).errors).toContain(
      ".npmrc must contain exactly the final npm policy",
    );
  });

  it("covers the final npm release-age policy", () => {
    expect(
      verifyFinalNpmPolicy(
        "save-exact=true\nengine-strict=true\nmin-release-age=7\n",
      ),
    ).toEqual([]);
    expect(
      verifyFinalNpmPolicy(
        "save-exact=true\nengine-strict=true\nmin-release-age=7d\n",
      ),
    ).toContain(".npmrc must document min-release-age=7");
    expect(
      verifyFinalNpmPolicy(
        "save-exact=true\nengine-strict=true\nmin-release-age=7\nlegacy-peer-deps=true\n",
      ),
    ).toContain(".npmrc must contain exactly the final npm policy");
  });

  it("proves the Phase 3 package target matrix without freezing ongoing policy", () => {
    const repository = validRepository();
    mutateJson(repository, "package.json", (packageJson) => {
      packageJson.dependencies = {
        cors: "2.8.6",
        dotenv: "17.4.2",
        express: "5.2.1",
        "express-rate-limit": "8.5.2",
        moment: "2.30.1",
      };
      packageJson.devDependencies = {
        "@types/cors": "2.8.19",
        "@types/express": "5.0.6",
        "@types/node": "24.13.2",
        "@vitest/coverage-v8": "4.1.8",
        prettier: "3.8.4",
        typescript: "6.0.3",
        vitest: "4.1.8",
        "vitest-mock-express": "2.2.0",
      };
    });
    mutateJson(repository, "package-lock.json", (lockfile) => {
      lockfile.packages[""].dependencies = {
        cors: "2.8.6",
        dotenv: "17.4.2",
        express: "5.2.1",
        "express-rate-limit": "8.5.2",
        moment: "2.30.1",
      };
      lockfile.packages[""].devDependencies = {
        "@types/cors": "2.8.19",
        "@types/express": "5.0.6",
        "@types/node": "24.13.2",
        "@vitest/coverage-v8": "4.1.8",
        prettier: "3.8.4",
        typescript: "6.0.3",
        vitest: "4.1.8",
        "vitest-mock-express": "2.2.0",
      };

      for (const [name, version] of Object.entries({
        ...lockfile.packages[""].dependencies,
        ...lockfile.packages[""].devDependencies,
      })) {
        lockfile.packages[`node_modules/${name}`] = { version };
      }
    });

    expect(verifyPackageTargetMatrix(repository).errors).toEqual([]);

    mutateJson(repository, "package.json", (packageJson) => {
      packageJson.dependencies.cors = "2.8.7";
    });

    expect(verifyPackageTargetMatrix(repository).errors).toContain(
      "dependencies.cors must be 2.8.6 for Phase 3 landing evidence",
    );
    expect(verifyDependencyPolicy(repository).errors).not.toContain(
      "dependencies.cors must be 2.8.6 for Phase 3 landing evidence",
    );
  });

  it("validates the Phase 4 CI workflow contract", () => {
    expect(verifyCiWorkflow(validCiWorkflow()).errors).toEqual([]);

    const repository = validRepository();
    repository.files[".github/workflows/pipeline.yml"] =
      "on:\n  push:\n    branches:\n      - main\njobs:\n  deploy:\n    steps:\n      - uses: actions/checkout@main\n      - run: npm install\n";

    expect(
      verifyCiWorkflow(repository.files[".github/workflows/pipeline.yml"])
        .errors,
    ).toEqual(
      expect.arrayContaining([
        "CI workflow must run on pull_request",
        "CI workflow must expose ci/install as a job",
        "CI workflow must run npm ci in every baseline job",
        "CI workflow must set up Node from .nvmrc",
        "CI workflow must ensure npm 11.13.0",
        "CI workflow must use tracked non-floating GitHub Action refs",
      ]),
    );
  });

  it("validates the Dockerfile runtime contract without freezing future digest refreshes", () => {
    expect(verifyDockerfile(validDockerfile()).errors).toEqual([]);
    expect(
      verifyDockerfile(
        validDockerfile().replace(
          "node:24.16.0-alpine@sha256:fb71d01345f11b708a3553c66e7c74074f2d506400ea81973343d915cb64eef0",
          "node:24.17.0-alpine@sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        ),
      ).errors,
    ).toEqual([]);

    const invalidDockerfile = validDockerfile()
      .replace(
        "node:24.16.0-alpine@sha256:fb71d01345f11b708a3553c66e7c74074f2d506400ea81973343d915cb64eef0 as base",
        "node:22.17.0-alpine as base",
      )
      .replace("RUN npm ci --include=dev", "RUN npm install")
      .replace("RUN npm run build\n", "")
      .replace("RUN npm prune --omit=dev\n", "")
      .replace("EXPOSE 3000", "EXPOSE 8080")
      .replace('CMD [ "node", "build/index.js" ]', 'CMD [ "npm", "start" ]');

    expect(verifyDockerfile(invalidDockerfile).errors).toEqual(
      expect.arrayContaining([
        "Dockerfile base image must be Node 24 Alpine pinned by digest",
        "Dockerfile install must use npm ci",
        "Dockerfile must build TypeScript",
        "Dockerfile must prune development dependencies",
        "Dockerfile must expose port 3000",
        "Dockerfile must start node build/index.js",
      ]),
    );
    expect(verifyDependencyPolicy().errors).not.toContain(
      "Dockerfile base image must be Node 24 Alpine pinned by digest",
    );
  });

  it("validates Dependabot update intake for npm, Docker, and GitHub Actions", () => {
    expect(verifyDependabotConfig(validDependabotConfig()).errors).toEqual([]);

    const invalidConfig = validDependabotConfig()
      .replace("version: 2\n", "")
      .replace('- package-ecosystem: "npm"', '- directory: "/"')
      .replace(
        '- package-ecosystem: "docker"',
        '- package-ecosystem: "docker"\n    directory: "/app"',
      )
      .replace('interval: "weekly"', "")
      .replace("default-days: 7", "default-days: 3");

    expect(verifyDependabotConfig(invalidConfig).errors).toEqual(
      expect.arrayContaining([
        "Dependabot config must use version: 2",
        "Dependabot config must include npm updates at /",
        "Dependabot config must include docker updates at /",
        "Dependabot config must set schedule.interval for every ecosystem",
        "Dependabot config must set cooldown.default-days: 7 for every ecosystem",
      ]),
    );
  });

  it("validates safe Dependabot automerge workflow shape and executable decisions", () => {
    expect(
      verifyDependabotAutomergeWorkflow(validDependabotAutomergeWorkflow())
        .errors,
    ).toEqual([]);

    const checks = [
      "ci/install",
      "ci/audit-signatures",
      "ci/audit-vulnerabilities",
      "ci/format",
      "ci/build",
      "ci/test-coverage",
    ].map((name) => ({ name, conclusion: "success", head_sha: "head" }));
    const statuses = [
      {
        context: "dependabot/metadata",
        state: "success",
        description:
          '{"ecosystem":"npm","directory":"/","updateType":"version-update:semver-minor"}',
      },
    ];

    expect(runWorkflowDecision({ statuses, checks }).status).toBe(0);

    for (const updateType of [
      "version-update:semver-patch",
      "version-update:semver-minor",
    ]) {
      const npmAndYarnStatuses = [
        {
          context: "dependabot/metadata",
          state: "success",
          description: JSON.stringify({
            ecosystem: "npm_and_yarn",
            directory: "/",
            updateType,
          }),
        },
      ];

      expect(
        runWorkflowDecision({ statuses: npmAndYarnStatuses, checks }).status,
      ).toBe(0);
    }
    expect(
      runWorkflowDecision({
        statuses: [
          statuses[0],
          { ...statuses[0], state: "failure", description: "stale" },
        ],
        checks,
      }).status,
    ).toBe(1);
    expect(
      runWorkflowDecision({
        statuses: [{ ...statuses[0], state: "failure" }, statuses[0]],
        checks,
      }).status,
    ).toBe(0);
    expect(
      runWorkflowDecision({
        statuses: [
          {
            ...statuses[0],
            created_at: "2026-06-13T10:00:00Z",
            state: "success",
          },
          {
            ...statuses[0],
            created_at: "2026-06-13T09:00:00Z",
            state: "failure",
          },
        ],
        checks,
      }).status,
    ).toBe(0);
    expect(
      runWorkflowDecision({
        statuses: [
          {
            ...statuses[0],
            created_at: "2026-06-13T10:00:00Z",
            state: "success",
          },
          {
            ...statuses[0],
            created_at: "2026-06-13T10:00:00Z",
            state: "failure",
          },
        ],
        checks,
      }).status,
    ).toBe(1);
    expect(
      runWorkflowDecision({
        statuses: [
          {
            ...statuses[0],
            created_at: "2026-06-13T10:00:00Z",
            state: "success",
          },
          {
            ...statuses[0],
            created_at: "2026-06-13T10:00:00Z",
            state: "failure",
          },
        ],
        checks,
      }).status,
    ).toBe(1);

    for (const [ecosystem, updateType] of [
      ["npm", "version-update:semver-major"],
      ["npm_and_yarn", "version-update:semver-major"],
      ["npm_and_yarn", "security-update:semver-patch"],
      ["npm_and_yarn", "unknown"],
      ["docker", "security-update:semver-patch"],
      ["github-actions", "security-update:semver-minor"],
      ["terraform", "version-update:semver-patch"],
      ["npm", "unknown"],
    ]) {
      expect(
        runWorkflowDecision({
          statuses: [
            {
              context: "dependabot/metadata",
              state: "success",
              description: JSON.stringify({
                ecosystem,
                directory: "/",
                updateType,
              }),
            },
          ],
          checks,
        }).status,
      ).toBe(1);
    }

    expect(
      runWorkflowDecision({ statuses, checks: checks.slice(1) }).status,
    ).toBe(1);

    expect(
      verifyDependabotAutomergeWorkflow(
        validDependabotAutomergeWorkflow()
          .replace("pull-requests: read\n      statuses: write", "")
          .replace(' --match-head-commit "$HEAD_SHA"', "")
          .replace(
            "- uses: dependabot/fetch-metadata@v3",
            "- uses: actions/checkout@v6",
          ),
      ).errors,
    ).toEqual(
      expect.arrayContaining([
        "Dependabot automerge metadata job must declare exact permissions",
        "Dependabot automerge workflow must not check out code",
        "Dependabot automerge must protect against stale heads",
      ]),
    );
  });

  it("requires Dependabot version: 2 at the top level", () => {
    expect(
      verifyDependabotConfig(
        validDependabotConfig().replace(
          "version: 2\n",
          "metadata:\n  version: 2\n",
        ),
      ).errors,
    ).toContain("Dependabot config must use version: 2");
  });

  it("accepts Dependabot cron schedules", () => {
    expect(
      verifyDependabotConfig(
        validDependabotConfig().replaceAll(
          'interval: "weekly"',
          'interval: "cron"\n      cronjob: "0 8 * * 1"',
        ),
      ).errors,
    ).toEqual([]);
  });

  it("requires Dependabot updates to be under the top-level updates key", () => {
    expect(
      verifyDependabotConfig(
        validDependabotConfig().replace("updates:", "not-updates:"),
      ).errors,
    ).toEqual(
      expect.arrayContaining([
        "Dependabot config must include npm updates at /",
        "Dependabot config must include docker updates at /",
        "Dependabot config must include github-actions updates at /",
      ]),
    );
  });

  it.each([
    [
      "unsupported ecosystem",
      `${validDependabotConfig()}
  - package-ecosystem: "pip"
    directory: "/"
    schedule:
      interval: "weekly"
`,
      "Dependabot config must include only Phase 6 ecosystems",
    ],
    [
      "duplicate ecosystem",
      `${validDependabotConfig()}
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
`,
      "Dependabot config must include each Phase 6 ecosystem exactly once",
    ],
    [
      "unsupported schedule interval",
      validDependabotConfig().replace(
        'interval: "weekly"',
        'interval: "bogus"',
      ),
      "Dependabot config must set a supported schedule.interval for every ecosystem",
    ],
  ])("rejects Dependabot %s entries", (_name, content, error) => {
    expect(verifyDependabotConfig(content).errors).toContain(error);
  });

  it("requires the final Docker runtime stage to inherit the Node 24 digest-pinned base", () => {
    for (const wrongFinalRuntime of [
      "node:22.17.0-alpine@sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      "node:24.16.0-alpine@sha256:fb71d01345f11b708a3553c66e7c74074f2d506400ea81973343d915cb64eef0",
    ]) {
      expect(
        verifyDockerfile(
          validDockerfile().replace(
            "FROM base\nCOPY --from=build /app /app",
            `FROM ${wrongFinalRuntime}\nCOPY --from=build /app /app`,
          ),
        ).errors,
      ).toEqual([
        "Dockerfile final runtime stage must inherit the Node 24 digest-pinned base",
      ]);
    }

    expect(
      verifyDockerfile(
        validDockerfile()
          .replace(" as base", " as runtime")
          .replaceAll("FROM base", "FROM runtime"),
      ).errors,
    ).toEqual([
      "Dockerfile final runtime stage must inherit the Node 24 digest-pinned base",
      "Dockerfile build stage must inherit the Node 24 digest-pinned base",
    ]);
  });

  it("requires the Docker build stage to inherit the verified base", () => {
    expect(
      verifyDockerfile(
        validDockerfile().replace(
          "FROM base as build",
          "FROM node:22.17.0-alpine as build",
        ),
      ).errors,
    ).toEqual([
      "Dockerfile build stage must inherit the Node 24 digest-pinned base",
    ]);
  });

  it("requires the final Docker runtime stage to copy from the verified build stage", () => {
    expect(
      verifyDockerfile(
        validDockerfile().replace(
          "COPY --from=build /app /app",
          "COPY --from=base /app /app",
        ),
      ).errors,
    ).toEqual([
      "Dockerfile final runtime stage must copy from the verified build stage",
    ]);
  });

  it("requires the final Docker runtime stage to start the compiled API", () => {
    expect(
      verifyDockerfile(
        validDockerfile()
          .replace(
            'CMD [ "node", "build/index.js" ]\n',
            'CMD [ "npm", "start" ]\n',
          )
          .replace(
            "RUN npm prune --omit=dev",
            'RUN npm prune --omit=dev\nCMD [ "node", "build/index.js" ]',
          ),
      ).errors,
    ).toEqual(["Dockerfile must start node build/index.js"]);
  });

  it("accepts a future Docker base refresh without changing landing proof policy", () => {
    const repository = validRepository();
    repository.files.Dockerfile = validDockerfile().replace(
      "node:24.16.0-alpine@sha256:fb71d01345f11b708a3553c66e7c74074f2d506400ea81973343d915cb64eef0",
      "node:24.17.0-alpine@sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    );
    repository.files["docs/PROJECT.md"] = repository.files[
      "docs/PROJECT.md"
    ].replace(
      "node:24.16.0-alpine@sha256:fb71d01345f11b708a3553c66e7c74074f2d506400ea81973343d915cb64eef0",
      "node:24.17.0-alpine@sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    );

    expect(verifyDependencyPolicy(repository).errors).toEqual([]);
  });

  it("accepts future tracked GitHub Action refs without changing landing proof docs", () => {
    const repository = validRepository();
    repository.files[".github/workflows/pipeline.yml"] = validCiWorkflow()
      .replaceAll("actions/checkout@v6", "actions/checkout@v7")
      .replaceAll("actions/setup-node@v6", "actions/setup-node@v7")
      .replaceAll(
        "superfly/flyctl-actions/setup-flyctl@v1",
        "superfly/flyctl-actions/setup-flyctl@v2",
      );

    expect(
      verifyCiWorkflow(repository.files[".github/workflows/pipeline.yml"])
        .errors,
    ).toEqual([]);
    expect(verifyDependencyPolicy(repository).errors).toEqual([]);
  });

  it.each([
    ["floating main", "actions/checkout@main"],
    ["floating master", "actions/checkout@master"],
    ["floating latest", "actions/checkout@latest"],
    ["branch-like ref", "actions/checkout@release/v7"],
    ["bare action", "actions/checkout"],
    ["untracked action", "untracked/example-action@v1"],
  ])("rejects CI workflow %s action refs", (_, actionRef) => {
    const workflow = validCiWorkflow().replaceAll(
      "actions/checkout@v6",
      actionRef,
    );

    expect(verifyCiWorkflow(workflow).errors).toContain(
      "CI workflow must use tracked non-floating GitHub Action refs",
    );
  });

  it("rejects CI workflow drift that removes signature audit", () => {
    const workflow = validCiWorkflow().replace(
      "      - run: npm audit signatures --min-release-age=0\n",
      "",
    );

    expect(verifyCiWorkflow(workflow).errors).toContain(
      "CI workflow must run npm audit signatures --min-release-age=0",
    );
  });

  it("rejects CI workflow drift that moves signature audit to the wrong job", () => {
    const workflow = validCiWorkflow()
      .replace(
        "      - run: npm ci\n      - run: npm audit signatures --min-release-age=0\n\n  audit-vulnerabilities:",
        "      - run: npm ci\n\n  audit-vulnerabilities:",
      )
      .replace(
        "      - run: npm audit --audit-level=high",
        "      - run: npm audit signatures --min-release-age=0\n      - run: npm audit --audit-level=high",
      );

    expect(verifyCiWorkflow(workflow).errors).toContain(
      "CI workflow must run npm audit signatures --min-release-age=0",
    );
  });

  it("rejects CI workflow drift that audits signatures before npm ci", () => {
    const workflow = validCiWorkflow().replace(
      "      - run: npm ci\n      - run: npm audit signatures --min-release-age=0",
      "      - run: npm audit signatures --min-release-age=0\n      - run: npm ci",
    );

    expect(verifyCiWorkflow(workflow).errors).toContain(
      "CI workflow must run npm ci before audit signatures",
    );
  });

  it("rejects CI workflow drift that omits npm ci from signature audit", () => {
    const workflow = validCiWorkflow().replace(
      "      - run: npm ci\n      - run: npm audit signatures --min-release-age=0",
      "      - run: npm audit signatures --min-release-age=0",
    );

    expect(verifyCiWorkflow(workflow).errors).toContain(
      "CI workflow must run npm ci before audit signatures",
    );
  });

  it("rejects CI workflow drift that omits npm ci from a required baseline job", () => {
    const workflow = validCiWorkflow().replace(
      "      - run: npm ci\n      - run: ./run.sh build",
      "      - run: ./run.sh build",
    );

    expect(verifyCiWorkflow(workflow).errors).toContain(
      "CI workflow must run npm ci in every baseline job",
    );
  });

  it("rejects CI workflow drift that comments out a required baseline job command", () => {
    const workflow = validCiWorkflow().replace(
      "      - run: npm ci\n      - run: ./run.sh build",
      "      # - run: npm ci\n      - run: ./run.sh build",
    );

    expect(verifyCiWorkflow(workflow).errors).toContain(
      "CI workflow must run npm ci in every baseline job",
    );
  });

  it("rejects CI workflow drift that comments out the deploy guard", () => {
    const workflow = validCiWorkflow().replace(
      "    if: github.event_name == 'push' && github.ref == 'refs/heads/main'",
      "    # if: github.event_name == 'push' && github.ref == 'refs/heads/main'",
    );

    expect(verifyCiWorkflow(workflow).errors).toContain(
      "CI deploy must run only for main pushes",
    );
  });

  it("rejects CI workflow drift that omits Node setup from a required baseline job", () => {
    const workflow = validCiWorkflow().replace(
      `  test-coverage:
    name: ci/test-coverage
    runs-on: ubuntu-latest
    needs: install
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version-file: .nvmrc
      - run: npm install -g npm@11.13.0
      - run: npm ci
      - run: ./run.sh test`,
      `  test-coverage:
    name: ci/test-coverage
    runs-on: ubuntu-latest
    needs: install
    steps:
      - uses: actions/checkout@v6
      - run: npm ci
      - run: ./run.sh test`,
    );

    expect(verifyCiWorkflow(workflow).errors).toEqual(
      expect.arrayContaining([
        "CI workflow must set up Node from .nvmrc",
        "CI workflow must ensure npm 11.13.0",
      ]),
    );
  });
});
