import type { ICruiseOptions, IViolation } from "dependency-cruiser";
import type { WorkspaceSpec } from "#src/support/workspaces.ts";
import { collectDirectoryCycles } from "./directory-cycles.ts";
import { collectModules } from "./modules.ts";
import path from "node:path";

export async function collectWorkspaceViolations(
  repoRoot: string,
  workspace: WorkspaceSpec,
  depcruiseOptions: ICruiseOptions,
): Promise<WorkspaceViolations> {
  const workspaceRoot = path.resolve(repoRoot, workspace.relativePath);
  const { modules, violations } = await collectModules(repoRoot, workspace, depcruiseOptions);

  return {
    directory: collectDirectoryCycles(repoRoot, workspaceRoot, workspace.sourceRoots, modules).map(
      ({ directories, examples }) => ({
        directories,
        examples,
      }),
    ),
    scope: workspace.name,
    strict: violations,
  };
}

export interface DirectoryViolation {
  directories: string[];
  examples: string[];
}

export interface WorkspaceViolations {
  directory: DirectoryViolation[];
  scope: string;
  strict: IViolation[];
}
