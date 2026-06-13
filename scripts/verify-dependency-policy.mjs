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
const rtkBootstrapCommand = /^curl\s+-fsSL\s+https:\/\/raw\.githubusercontent\.com\/rtk-ai\/rtk\/v0\.42\.4\/install\.sh\s+\|\s+sh$/;
const contextModeBootstrapCommand = `npm install -g ${contextModePackage}`;
const documentedMatrix = [
  nodeVersion,
  npmVersion,
  "node:24.16.0-alpine@sha256:fb71d01345f11b708a3553c66e7c74074f2d506400ea81973343d915cb64eef0",
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

export function verifyDependencyPolicy(repository = readRepository()) {
  const errors = [];
  const packageJson = readJson(repository, "package.json", errors);
  const lockfile = readJson(repository, "package-lock.json", errors);

  if (packageJson) {
    expectEqual(errors, "package.json engines.node", packageJson.engines?.node, nodeVersion);
    expectEqual(errors, "package.json packageManager", packageJson.packageManager, packageManager);
    verifyDirectDependencies(errors, packageJson);
  }

  if (packageJson && lockfile) {
    verifyLockfileRoot(errors, packageJson, lockfile);
  }

  expectEqual(errors, ".nvmrc", readFile(repository, ".nvmrc").trim(), nodeVersion);
  errors.push(...verifyFinalNpmPolicy(readFile(repository, ".npmrc")));
  verifyBootstrapPins(errors, readFile(repository, "run.sh"));
  verifyRequiredLines(
    errors,
    "docs/PROJECT.md",
    readFile(repository, "docs/PROJECT.md"),
    [...documentedMatrix, ...documentedPackageTargetDependencies],
  );

  return { errors };
}

export function verifyFinalNpmPolicy(content) {
  const errors = [];
  const expectedValues = [...npmPolicy, "min-release-age=7"];
  verifyExactLines(errors, ".npmrc", content, expectedValues);

  const assignments = npmPolicyAssignments(content);

  if (
    assignments.length !== expectedValues.length ||
    !expectedValues.every((expectedValue) => assignments.includes(expectedValue))
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
  const escapedValue = expectedValue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^\\w@])${escapedValue}(?=$|[^\\w@.:-])`).test(
    content,
  );
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

  if (
    !commands.some((line) => rtkBootstrapCommand.test(line))
  ) {
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
    if (packageJson.dependencies?.[dependency] || packageJson.devDependencies?.[dependency]) {
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
