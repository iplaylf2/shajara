import type { ICruiseOptions } from "dependency-cruiser";
import type { WorkspaceSpec } from "#src/support/workspaces.ts";
import { cruise } from "dependency-cruiser";

export async function collectModules(
  repoRoot: string,
  { entries, tsconfigPath }: WorkspaceSpec,
  depcruiseOptions: ICruiseOptions,
): Promise<ModuleRecord[]> {
  const result = (await cruise(entries, {
    ...depcruiseOptions,
    baseDir: repoRoot,
    tsConfig: {
      fileName: tsconfigPath,
    },
  })) as { output: { modules: ModuleRecord[] } };

  return result.output.modules;
}

export interface ModuleRecord {
  dependencies: DependencyRecord[];
  source: string;
}

export interface DependencyRecord {
  couldNotResolve?: boolean;
  coreModule?: boolean;
  resolved?: string;
}
