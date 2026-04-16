import type { ICruiseOptions } from "dependency-cruiser";
import type { WorkspaceSpec } from "#src/support/workspaces.ts";
import { collectDirectoryCycles } from "./directory-cycles.ts";
import { collectModules } from "./modules.ts";
import path from "node:path";

export async function collectWorkspaceViolations(
  repoRoot: string,
  workspace: WorkspaceSpec,
  depcruiseOptions: ICruiseOptions,
): Promise<Violation[]> {
  const workspaceRoot = path.resolve(repoRoot, workspace.relativePath);
  const modules = await collectModules(repoRoot, workspace, depcruiseOptions);

  return collectDirectoryCycles(repoRoot, workspaceRoot, workspace.sourceRoots, modules).map(
    ({ directories, examples }) => ({
      directories,
      examples,
      scope: workspace.name,
    }),
  );
}

export interface Violation {
  directories: string[];
  examples: string[];
  scope: string;
}
