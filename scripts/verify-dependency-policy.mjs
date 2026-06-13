#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const nodeVersion = "24.16.0";
const npmVersion = "11.13.0";
const packageManager = `npm@${npmVersion}`;
const removedDependencies = ["express-validator", "@flydotio/dockerfile"];
const npmPolicy = ["save-exact=true", "engine-strict=true"];
const rtkVersion = "v0.42.4";
const contextModePackage = "context-mode@1.0.162";
const rtkBootstrapCommand =
  /^curl\s+-fsSL\s+https:\/\/raw\.githubusercontent\.com\/rtk-ai\/rtk\/v0\.42\.4\/install\.sh\s+\|\s+sh$/;
const contextModeBootstrapCommand = `npm install -g ${contextModePackage}`;
const documentedMatrix = [
  nodeVersion,
  npmVersion,
  "v0.42.4",
  "1.0.162",
  "actions/checkout@v6",
  "actions/setup-node@v6",
  "superfly/flyctl-actions/setup-flyctl@v1",
  "dependabot/fetch-metadata@v3",
];
const documentedPackageTargetDependencies = [
  "cors@2.8.6",
  "dotenv@17.4.2",
  "express@5.2.1",
  "express-rate-limit@8.5.2",
  "moment@2.30.1",
  "@types/cors@2.8.19",
  "@types/express@5.0.6",
  "@types/node@24.13.2",
  "@vitest/coverage-v8@4.1.8",
  "prettier@3.8.4",
  "typescript@6.0.3",
  "vitest@4.1.8",
  "vitest-mock-express@2.2.0",
];
const phase3TargetDependencies = {
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
};
const ciChecks = [
  "ci/install",
  "ci/audit-signatures",
  "ci/audit-vulnerabilities",
  "ci/format",
  "ci/build",
  "ci/test-coverage",
];
const ciDeployNeeds = [
  "audit-signatures",
  "audit-vulnerabilities",
  "format",
  "build",
  "test-coverage",
];
const ciGateCommandsByJob = [
  ["audit-signatures", "npm audit signatures --min-release-age=0"],
  ["audit-vulnerabilities", "npm audit --audit-level=high"],
  ["format", "./run.sh format"],
  ["build", "./run.sh build"],
  ["test-coverage", "./run.sh test"],
];
const ciBaselineRequirements = [
  ["node-version-file: .nvmrc", "CI workflow must set up Node from .nvmrc"],
  ["npm install -g npm@11.13.0", "CI workflow must ensure npm 11.13.0"],
  ["npm ci", "CI workflow must run npm ci in every baseline job"],
];
const trackedActionNames = [
  "actions/checkout",
  "actions/setup-node",
  "superfly/flyctl-actions/setup-flyctl",
];

export function verifyDependencyPolicy(repository = readRepository()) {
  const errors = [];
  const packageJson = readJson(repository, "package.json", errors);
  const lockfile = readJson(repository, "package-lock.json", errors);

  if (packageJson) {
    expectEqual(
      errors,
      "package.json engines.node",
      packageJson.engines?.node,
      nodeVersion,
    );
    expectEqual(
      errors,
      "package.json packageManager",
      packageJson.packageManager,
      packageManager,
    );
    verifyDirectDependencies(errors, packageJson);
  }

  if (packageJson && lockfile) {
    verifyLockfileRoot(errors, packageJson, lockfile);
  }

  expectEqual(
    errors,
    ".nvmrc",
    readFile(repository, ".nvmrc").trim(),
    nodeVersion,
  );
  errors.push(...verifyFinalNpmPolicy(readFile(repository, ".npmrc")));
  verifyBootstrapPins(errors, readFile(repository, "run.sh"));
  errors.push(
    ...verifyCiWorkflow(readFile(repository, ".github/workflows/pipeline.yml"))
      .errors,
  );
  errors.push(...verifyDockerfile(readFile(repository, "Dockerfile")).errors);
  verifyRequiredLines(
    errors,
    "docs/PROJECT.md",
    readFile(repository, "docs/PROJECT.md"),
    [...documentedMatrix, ...documentedPackageTargetDependencies],
  );

  return { errors };
}

export function verifyCiWorkflow(content) {
  const errors = [];
  const activeContent = uncommentedContent(content);

  if (!/^\s*pull_request:\s*$/m.test(activeContent)) {
    errors.push("CI workflow must run on pull_request");
  }

  if (
    !/^\s*push:\s*$/m.test(activeContent) ||
    !/^\s*-\s*main\s*$/m.test(activeContent)
  ) {
    errors.push("CI workflow must run on main pushes");
  }

  for (const check of ciChecks) {
    if (
      !new RegExp(`^\\s*name:\\s*${escapeRegExp(check)}\\s*$`, "m").test(
        activeContent,
      )
    ) {
      errors.push(`CI workflow must expose ${check} as a job`);
    }
  }

  const jobs = Object.fromEntries(
    ["install", ...ciDeployNeeds].map((job) => [
      job,
      ciJobContent(activeContent, job),
    ]),
  );

  const auditSignaturesJob = jobs["audit-signatures"];
  if (
    auditSignaturesJob.includes("npm audit signatures --min-release-age=0") &&
    (auditSignaturesJob.indexOf("npm ci") === -1 ||
      auditSignaturesJob.indexOf("npm ci") >
        auditSignaturesJob.indexOf("npm audit signatures --min-release-age=0"))
  ) {
    errors.push("CI workflow must run npm ci before audit signatures");
  }

  for (const [requirement, message] of ciBaselineRequirements) {
    if (Object.values(jobs).some((job) => !job.includes(requirement))) {
      errors.push(message);
    }
  }

  for (const [job, command] of ciGateCommandsByJob) {
    expectIncludes(
      errors,
      jobs[job],
      command,
      `CI workflow must run ${command}`,
    );
  }

  verifyTrackedActionRefs(errors, activeContent);

  if (
    !/if:\s*github\.event_name == 'push' && github\.ref == 'refs\/heads\/main'/.test(
      activeContent,
    )
  ) {
    errors.push("CI deploy must run only for main pushes");
  }

  for (const job of ciDeployNeeds) {
    expectIncludes(
      errors,
      activeContent,
      `- ${job}`,
      `CI deploy must need ${job}`,
    );
  }

  return { errors };
}

export function verifyDockerfile(content) {
  const errors = [];
  const activeContent = uncommentedContent(content);
  const stages = dockerStages(activeContent);
  const finalStageContent = finalDockerStageContent(activeContent, stages);

  const baseStage = stages.find(({ image }) => isNode24PinnedBase(image));
  if (!baseStage) {
    errors.push(
      "Dockerfile base image must be Node 24 Alpine pinned by digest",
    );
  }
  if (!finalDockerStageUsesBase(stages, baseStage)) {
    errors.push(
      "Dockerfile final runtime stage must inherit the Node 24 digest-pinned base",
    );
  }
  if (!dockerStageUsesBase(stages, "build")) {
    errors.push(
      "Dockerfile build stage must inherit the Node 24 digest-pinned base",
    );
  }
  expectInstruction(
    errors,
    finalStageContent,
    "COPY",
    "--from=build /app /app",
    "Dockerfile final runtime stage must copy from the verified build stage",
  );

  expectInstruction(
    errors,
    activeContent,
    "RUN",
    "npm ci",
    "Dockerfile install must use npm ci",
  );
  expectInstruction(
    errors,
    activeContent,
    "RUN",
    "npm run build",
    "Dockerfile must build TypeScript",
  );
  expectInstruction(
    errors,
    activeContent,
    "RUN",
    "npm prune --omit=dev",
    "Dockerfile must prune development dependencies",
  );
  expectInstruction(
    errors,
    activeContent,
    "EXPOSE",
    "3000",
    "Dockerfile must expose port 3000",
  );

  if (
    !/CMD\s+\[\s*"node"\s*,\s*"build\/index\.js"\s*\]/.test(finalStageContent)
  ) {
    errors.push("Dockerfile must start node build/index.js");
  }

  return { errors };
}

function dockerStages(content) {
  return [...content.matchAll(/^FROM\s+(\S+)(?:\s+as\s+(\S+))?\s*$/gim)].map(
    ({ 0: instruction, 1: image, 2: alias, index }) => ({
      image,
      alias,
      index,
      endIndex: index + instruction.length,
    }),
  );
}

function finalDockerStageUsesBase(stages, baseStage) {
  const finalStage = stages.at(-1);
  return (
    !!finalStage && baseStage?.alias === "base" && finalStage.image === "base"
  );
}

function dockerStageUsesBase(stages, alias) {
  return stages.some((stage) => stage.alias === alias && stage.image === "base");
}

function finalDockerStageContent(content, stages) {
  const finalStage = stages.at(-1);
  return finalStage ? content.slice(finalStage.endIndex) : "";
}

function isNode24PinnedBase(image) {
  return /^node:24\.\d+\.\d+-alpine@sha256:[0-9a-f]{64}$/i.test(image);
}

function expectInstruction(errors, content, instruction, value, message) {
  if (
    !new RegExp(
      `^\\s*${instruction}\\s+${escapeRegExp(value)}(?:\\s|$)`,
      "im",
    ).test(content)
  ) {
    errors.push(message);
  }
}

function uncommentedContent(content) {
  return content
    .split(/\r?\n/)
    .filter((line) => !line.trimStart().startsWith("#"))
    .join("\n");
}

function expectIncludes(errors, content, expected, message) {
  if (!content.includes(expected)) {
    errors.push(message);
  }
}

function ciJobContent(content, job) {
  return (
    content.match(
      new RegExp(`\\n  ${escapeRegExp(job)}:[\\s\\S]*?(?=\\n\\n  \\S|$)`),
    )?.[0] ?? ""
  );
}

function verifyTrackedActionRefs(errors, content) {
  const actionRefs = [...content.matchAll(/^\s*-\s*uses:\s*(\S+)\s*$/gm)].map(
    ([, actionRef]) => actionRef,
  );

  if (
    actionRefs.length === 0 ||
    !actionRefs.every((actionRef) => {
      const [actionName] = actionRef.split("@");
      return (
        trackedActionNames.includes(actionName) &&
        /^[^@\s]+@v\d+(?:\.\d+){0,2}(?:[-+][0-9A-Za-z.-]+)?$/.test(actionRef)
      );
    })
  ) {
    errors.push("CI workflow must use tracked non-floating GitHub Action refs");
  }
}

export function verifyFinalNpmPolicy(content) {
  const errors = [];
  const expectedValues = [...npmPolicy, "min-release-age=7"];
  verifyExactLines(errors, ".npmrc", content, expectedValues);

  const assignments = npmPolicyAssignments(content);

  if (
    assignments.length !== expectedValues.length ||
    !expectedValues.every((expectedValue) =>
      assignments.includes(expectedValue),
    )
  ) {
    errors.push(".npmrc must contain exactly the final npm policy");
  }

  return errors;
}

function npmPolicyAssignments(content) {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.includes("="));
}

export function verifyPackageTargetMatrix(repository = readRepository()) {
  const errors = [];
  const packageJson = readJson(repository, "package.json", errors);
  const lockfile = readJson(repository, "package-lock.json", errors);

  if (packageJson) {
    verifyExpectedDependencyMatrix(errors, packageJson);
  }

  if (packageJson && lockfile) {
    verifyLockfileRoot(errors, packageJson, lockfile);
  }

  return { errors };
}

function readRepository(root = new URL("..", import.meta.url).pathname) {
  return {
    read(path) {
      const absolutePath = join(root, path);
      return existsSync(absolutePath) ? readFileSync(absolutePath, "utf8") : "";
    },
  };
}

function readFile(repository, path) {
  return repository.files?.[path] ?? repository.read?.(path) ?? "";
}

function readJson(repository, path, errors) {
  try {
    return JSON.parse(readFile(repository, path));
  } catch {
    errors.push(`${path} must contain valid JSON`);
    return undefined;
  }
}

function expectEqual(errors, label, actual, expected) {
  if (actual !== expected) {
    errors.push(`${label} must be ${expected}`);
  }
}

function verifyRequiredLines(errors, label, content, expectedValues) {
  const lines = new Set(content.split(/\r?\n/).map((line) => line.trim()));

  for (const expectedValue of expectedValues) {
    if (!hasBoundedToken(content, expectedValue) && !lines.has(expectedValue)) {
      errors.push(`${label} must document ${expectedValue}`);
    }
  }
}

function hasBoundedToken(content, expectedValue) {
  const escapedValue = escapeRegExp(expectedValue);
  return new RegExp(`(^|[^\\w@])${escapedValue}(?=$|[^\\w@.:-])`).test(content);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function verifyExactLines(errors, label, content, expectedValues) {
  const lines = new Set(content.split(/\r?\n/).map((line) => line.trim()));

  for (const expectedValue of expectedValues) {
    if (!lines.has(expectedValue)) {
      errors.push(`${label} must document ${expectedValue}`);
    }
  }
}

function verifyBootstrapPins(errors, content) {
  const commands = content
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+#.*$/, "").trim());

  if (!commands.some((line) => rtkBootstrapCommand.test(line))) {
    errors.push(`run.sh must install RTK from ${rtkVersion}`);
  }

  if (!commands.some((line) => line === contextModeBootstrapCommand)) {
    errors.push(`run.sh must install ${contextModePackage}`);
  }
}

function verifyDirectDependencies(errors, packageJson) {
  for (const [section, dependencies] of Object.entries({
    dependencies: packageJson.dependencies ?? {},
    devDependencies: packageJson.devDependencies ?? {},
  })) {
    for (const [name, version] of Object.entries(dependencies)) {
      if (!/^\d+\.\d+\.\d+(?:-.+)?$/.test(version)) {
        errors.push(`${section}.${name} must use an exact version`);
      }
    }
  }

  for (const dependency of removedDependencies) {
    if (
      packageJson.dependencies?.[dependency] ||
      packageJson.devDependencies?.[dependency]
    ) {
      errors.push(`${dependency} must not be a direct dependency`);
    }
  }
}

function verifyExpectedDependencyMatrix(errors, packageJson) {
  for (const [section, expectedDependencies] of Object.entries(
    phase3TargetDependencies,
  )) {
    const dependencies = packageJson[section] ?? {};

    if (!equalEntries(expectedDependencies, dependencies)) {
      errors.push(`package.json ${section} must match Phase 3 target matrix`);
    }

    for (const [name, version] of Object.entries(expectedDependencies)) {
      if (dependencies[name] !== version) {
        errors.push(
          `${section}.${name} must be ${version} for Phase 3 landing evidence`,
        );
      }
    }
  }
}

function verifyLockfileRoot(errors, packageJson, lockfile) {
  const lockfilePackages = lockfile.packages ?? {};
  const rootPackage = lockfilePackages[""] ?? {};

  for (const dependency of removedDependencies) {
    const packagePath = lockfilePackagePath(dependency);
    if (lockfilePackages[packagePath]) {
      errors.push(`package-lock.json must not include ${packagePath}`);
    }
  }

  for (const section of ["dependencies", "devDependencies"]) {
    const packageDependencies = packageJson[section] ?? {};
    const lockfileDependencies = rootPackage[section] ?? {};

    if (!equalEntries(packageDependencies, lockfileDependencies)) {
      errors.push(`package-lock.json root ${section} must match package.json`);
    }

    for (const [name, version] of Object.entries(packageDependencies)) {
      const packagePath = lockfilePackagePath(name);
      const packageEntry = lockfilePackages[packagePath];

      if (packageEntry?.version !== version) {
        errors.push(
          `package-lock.json package entry ${packagePath} version must match ${section}.${name}`,
        );
      }
    }
  }
}

function lockfilePackagePath(name) {
  return `node_modules/${name}`;
}

function equalEntries(actual, expected) {
  const actualEntries = Object.entries(actual);
  return (
    actualEntries.length === Object.keys(expected).length &&
    actualEntries.every(([key, value]) => expected[key] === value)
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = verifyDependencyPolicy(readRepository(process.argv[2]));

  if (result.errors.length > 0) {
    console.error(result.errors.join("\n"));
    process.exit(1);
  }
}
