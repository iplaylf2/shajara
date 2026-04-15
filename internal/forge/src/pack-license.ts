import { copyFile, rm } from "node:fs/promises";
import { parseArgs } from "node:util";
import { requireEnvPath } from "./support/environment.ts";
import { resolve } from "node:path";

const licensePaths = resolveLicensePaths();
const mode = parseMode();

switch (mode) {
  case "stage": {
    await stageLicense(licensePaths);
    break;
  }
  case "clean": {
    await cleanLicense(licensePaths);
    break;
  }
  default: {
    throw new Error('Expected "stage" or "clean".');
  }
}

function resolveLicensePaths() {
  const repoRoot = requireEnvPath("PROJECT_CWD");
  const packageRoot = requireEnvPath("INIT_CWD");

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

interface ResolvedPaths {
  packageLicensePath: string;
  rootLicensePath: string;
}
