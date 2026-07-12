import type { ICruiseOptions, IViolation } from "dependency-cruiser";
import type { DirectoryViolation, WorkspaceViolations } from "./violations.ts";
import { allExtensions } from "dependency-cruiser";
import { collectWorkspaceViolations } from "./violations.ts";
import { collectWorkspaces } from "#src/support/workspaces.ts";
import extractDepcruiseOptions from "dependency-cruiser/config-utl/extract-depcruise-options";
import path from "node:path";
import { resolveWorkspaceRoot } from "#src/support/environment.ts";

const repoRoot = resolveWorkspaceRoot();
const depcruiseOptions = await loadDepcruiseOptions(repoRoot);
const workspaces = collectWorkspaces(repoRoot, getCruiseEntryExtensions(depcruiseOptions));
const workspaceReports = await Promise.all(
  workspaces.map((workspace) => collectWorkspaceViolations(repoRoot, workspace, depcruiseOptions)),
);
const { exitCode, output, stream } = renderReport(workspaceReports);

stream.write(output);
process.exitCode = exitCode;

function loadDepcruiseOptions(projectRoot: string) {
  const cruiseConfigPath = path.join(projectRoot, ".dependency-cruiser.json");

  return extractDepcruiseOptions(cruiseConfigPath);
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

function renderReport(reports: WorkspaceViolations[]) {
  const strictViolations = reports.flatMap(({ scope, strict }) =>
    strict.map((violation) => ({ scope, violation })),
  );
  const directoryViolations = reports.flatMap(({ scope, directory }) =>
    directory.map((violation) => ({ scope, violation })),
  );
  const hasErrors =
    strictViolations.some(({ violation }) => violation.rule.severity === "error") ||
    directoryViolations.length > 0;

  if (strictViolations.length === 0 && directoryViolations.length === 0) {
    return {
      exitCode: 0,
      output: "No dependency rule violations or directory cycles found.\n",
      stream: process.stdout,
    };
  }

  const lines: string[] = [];

  if (strictViolations.length > 0) {
    lines.push("Dependency rule violations:", "");

    for (const { scope, violation } of strictViolations) {
      lines.push(formatStrictViolation(scope, violation));
    }
  }

  if (directoryViolations.length > 0) {
    lines.push("Directory-level circular dependencies:", "");

    for (const { scope, violation } of directoryViolations) {
      lines.push(formatDirectoryViolation(scope, violation));
    }
  }

  return {
    exitCode: hasErrors ? 1 : 0,
    output: `${lines.join("\n")}\n`,
    stream: process.stderr,
  };
}

function formatStrictViolation(scope: string, violation: IViolation) {
  const target = violation.unresolvedTo ?? violation.to;
  const dependency = target ? `${violation.from} -> ${target}` : violation.from;

  return `[${scope}] [${violation.rule.severity}] ${violation.rule.name}: ${dependency}\n`;
}

function formatDirectoryViolation(scope: string, violation: DirectoryViolation) {
  return [
    `[${scope}] ${violation.directories.join(" <-> ")}`,
    violation.examples.join("\n"),
    "",
  ].join("\n");
}
