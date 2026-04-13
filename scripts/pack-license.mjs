import { copyFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { parseArgs } from "node:util";

const paths = resolvePaths();
const mode = parseMode();

switch (mode) {
  case "stage":
    await stageLicense(paths);
    break;
  case "clean":
    await cleanLicense(paths);
    break;
  default:
    throw new Error('Expected "stage" or "clean".');
}

function resolvePaths() {
  const repoRoot = resolve(process.env.PROJECT_CWD);
  const packageRoot = resolve(process.env.INIT_CWD);

  return {
    rootLicensePath: resolve(repoRoot, "LICENSE"),
    packageLicensePath: resolve(packageRoot, "LICENSE"),
  };
}

function parseMode() {
  const {
    positionals: [mode],
  } = parseArgs({
    allowPositionals: true,
    options: {},
    strict: true,
  });

  if (mode === "stage" || mode === "clean") {
    return mode;
  }

  throw new Error('Expected "stage" or "clean".');
}

async function stageLicense({ rootLicensePath, packageLicensePath }) {
  await copyFile(rootLicensePath, packageLicensePath);
}

async function cleanLicense({ packageLicensePath }) {
  await rm(packageLicensePath, { force: true });
}
