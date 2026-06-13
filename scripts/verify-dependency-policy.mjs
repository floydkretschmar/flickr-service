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
const documentedPhase2Dependencies = [
  "cors@2.8.5",
  "dotenv@16.6.1",
  "express@4.21.2",
  "express-rate-limit@7.5.1",
  "moment@2.30.1",
  "@types/cors@2.8.19",
  "@types/express@4.17.23",
  "@types/node@20.19.8",
  "@vitest/coverage-v8@3.2.4",
  "prettier@3.6.2",
  "typescript@5.8.3",
  "vitest@3.2.4",
  "vitest-mock-express@2.2.0",
];

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
  verifyPhase2NpmPolicy(errors, readFile(repository, ".npmrc"));
  verifyBootstrapPins(errors, readFile(repository, "run.sh"));
  verifyRequiredLines(
    errors,
    "docs/PROJECT.md",
    readFile(repository, "docs/PROJECT.md"),
    [...documentedMatrix, ...documentedPhase2Dependencies],
  );

  return { errors };
}

export function verifyFinalNpmPolicy(content) {
  const errors = [];
  verifyExactLines(errors, ".npmrc", content, [...npmPolicy, "min-release-age=7"]);
  return errors;
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

function verifyPhase2NpmPolicy(errors, content) {
  verifyNpmPolicyAssignments(errors, content, npmPolicy);

  if (content.split(/\r?\n/).some((line) => line.trim().startsWith("min-release-age="))) {
    errors.push(".npmrc must defer min-release-age until Phase 3");
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

function verifyNpmPolicyAssignments(errors, content, expectedValues) {
  const assignments = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.includes("="));

  for (const expectedValue of expectedValues) {
    const [key, value] = expectedValue.split("=");
    const actualValues = assignments
      .filter((line) => line.split("=")[0] === key)
      .map((line) => line.slice(key.length + 1));

    if (actualValues.length === 0) {
      errors.push(`.npmrc must document ${expectedValue}`);
    } else if (actualValues.length !== 1 || actualValues[0] !== value) {
      errors.push(`.npmrc must set ${key} exactly once to ${value}`);
    }
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
