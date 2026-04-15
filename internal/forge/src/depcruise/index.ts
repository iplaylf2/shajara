import type { ICruiseOptions } from "dependency-cruiser";
import { analyzeWorkspace } from "./analysis.ts";
import { collectWorkspaces } from "#src/support/workspaces.ts";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { requireEnvPath } from "#src/support/environment.ts";

const repoRoot = requireEnvPath("PROJECT_CWD");
const depcruiseOptions = await loadDepcruiseOptions(repoRoot);
const workspaces = collectWorkspaces(repoRoot);
const cycleReports = await Promise.all(
  workspaces.map((workspace) => analyzeWorkspace(repoRoot, workspace, depcruiseOptions)),
);
const violations = cycleReports.flat();
const { exitCode, output, stream } = renderCycleReport(violations);

stream.write(output);
process.exitCode = exitCode;

async function loadDepcruiseOptions(projectRoot: string) {
  const cruiseConfigPath = path.join(projectRoot, ".dependency-cruiser.mjs");
  const { default: configuration } = (await import(
    pathToFileURL(cruiseConfigPath).href
  )) as CruiseConfigurationModule;

  return configuration.options;
}

function renderCycleReport(reports: Violation[]) {
  if (reports.length === 0) {
    return {
      exitCode: 0,
      output: "No directory-level circular dependencies found.\n",
      stream: process.stdout,
    };
  }

  const lines = ["Directory-level circular dependencies found:", ""];

  for (const violation of reports) {
    lines.push(`[${violation.scope}] ${violation.directories.join(" <-> ")}`);
    lines.push(violation.examples.join("\n"));
    lines.push("");
  }

  return {
    exitCode: 1,
    output: `${lines.join("\n")}\n`,
    stream: process.stderr,
  };
}

interface Violation {
  directories: string[];
  examples: string[];
  scope: string;
}

interface CruiseConfiguration {
  options: ICruiseOptions;
}

interface CruiseConfigurationModule {
  default: CruiseConfiguration;
}
