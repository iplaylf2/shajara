import type { ICruiseOptions } from "dependency-cruiser";
import type { Violation } from "./violations.ts";
import { allExtensions } from "dependency-cruiser";
import { collectWorkspaceViolations } from "./violations.ts";
import { collectWorkspaces } from "#src/support/workspaces.ts";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { resolveWorkspaceRoot } from "#src/support/environment.ts";

const repoRoot = resolveWorkspaceRoot();
const depcruiseOptions = await loadDepcruiseOptions(repoRoot);
const workspaces = collectWorkspaces(repoRoot, getCruiseEntryExtensions(depcruiseOptions));
const cycleReports = await Promise.all(
  workspaces.map((workspace) => collectWorkspaceViolations(repoRoot, workspace, depcruiseOptions)),
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

function getCruiseEntryExtensions(options: ICruiseOptions) {
  const configuredExtensionList = options.enhancedResolveOptions?.extensions;
  const configuredExtensions = configuredExtensionList && new Set(configuredExtensionList);

  return allExtensions
    .filter(
      ({ available, extension }) =>
        available && (!configuredExtensions || configuredExtensions.has(extension)),
    )
    .map(({ extension }) => extension);
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
    lines.push(
      `[${violation.scope}] ${violation.directories.join(" <-> ")}`,
      violation.examples.join("\n"),
      "",
    );
  }

  return {
    exitCode: 1,
    output: `${lines.join("\n")}\n`,
    stream: process.stderr,
  };
}
interface CruiseConfiguration {
  options: ICruiseOptions;
}

interface CruiseConfigurationModule {
  default: CruiseConfiguration;
}
