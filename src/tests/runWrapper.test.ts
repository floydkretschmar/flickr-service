import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const repoRoot = new URL("../..", import.meta.url).pathname;
const formatScope =
  'prettier --check --no-error-on-unmatched-pattern "src/**/*.ts" "docs/**/*.md" ".github/**/*.yml" ".github/**/*.yaml" "package.json" "package-lock.json" "tsconfig.json"';

function runWithFakeNpm(command: string) {
  const tempDir = mkdtempSync(join(tmpdir(), "flickr-service-run-"));
  const logFile = join(tempDir, "npm.log");

  try {
    writeFileSync(
      join(tempDir, "npm"),
      `#!/usr/bin/env sh\nprintf '%s\\n' "$*" >> "${logFile}"\n`,
      { mode: 0o755 },
    );

    execFileSync("./run.sh", [command], {
      cwd: repoRoot,
      env: { ...process.env, PATH: `${tempDir}:${process.env.PATH}` },
    });

    return readFileSync(logFile, "utf8").trim();
  } finally {
    rmSync(tempDir, { force: true, recursive: true });
  }
}

describe("run.sh validation gates", () => {
  it.each([
    ["test", "run verify:policy\nrun coverage"],
    ["format", "run format"],
    ["build", "run build"],
  ])("runs npm for the %s gate", (command, expectedNpmArgs) => {
    expect(runWithFakeNpm(command)).toBe(expectedNpmArgs);
  });
});

describe("package formatting gate", () => {
  it("checks only the maintained-file Prettier scope", () => {
    const packageJson = JSON.parse(
      readFileSync(join(repoRoot, "package.json"), "utf8"),
    ) as { scripts?: Record<string, string> };

    expect(packageJson.scripts?.format).toBe(formatScope);
    expect(packageJson.scripts?.format).not.toContain(".codex");
  });
});
