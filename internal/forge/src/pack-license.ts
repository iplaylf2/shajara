import { copyFile, rm } from "node:fs/promises";
import { parseArgs } from "node:util";
import { resolve } from "node:path";

const paths = resolvePaths();
const mode = parseMode();

switch (mode) {
  case "stage": {
    await stageLicense(paths);
    break;
  }
  case "clean": {
    await cleanLicense(paths);
    break;
  }
  default: {
    throw new Error('Expected "stage" or "clean".');
  }
}

function resolvePaths() {
  const repoRoot = resolve(requireEnv("PROJECT_CWD"));
  const packageRoot = resolve(requireEnv("INIT_CWD"));

  return {
    packageLicensePath: resolve(packageRoot, "LICENSE"),
    rootLicensePath: resolve(repoRoot, "LICENSE"),
  };
}

function parseMode() {
  const {
    positionals: [parsedMode],
  } = parseArgs({
    allowPositionals: true,
    options: {},
    strict: true,
  });

  if (parsedMode === "stage" || parsedMode === "clean") {
    return parsedMode;
  }

  throw new Error('Expected "stage" or "clean".');
}

async function stageLicense({ rootLicensePath, packageLicensePath }: ResolvedPaths) {
  await copyFile(rootLicensePath, packageLicensePath);
}

async function cleanLicense({ packageLicensePath }: ResolvedPaths) {
  await rm(packageLicensePath, { force: true });
}

function requireEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Expected ${name} to be set.`);
  }

  return value;
}

interface ResolvedPaths {
  packageLicensePath: string;
  rootLicensePath: string;
}
