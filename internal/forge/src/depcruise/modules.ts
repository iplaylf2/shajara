import type { ICruiseOptions, IViolation } from "dependency-cruiser";
import type { WorkspaceSpec } from "#src/support/workspaces.ts";
import { cruise } from "dependency-cruiser";

export async function collectModules(
  repoRoot: string,
  { entries, tsconfigPath }: WorkspaceSpec,
  depcruiseOptions: ICruiseOptions,
): Promise<CruiseResult> {
  const result = (await cruise(entries, {
    ...depcruiseOptions,
    baseDir: repoRoot,
    tsConfig: {
      fileName: tsconfigPath,
    },
  })) as { output: { modules: ModuleRecord[]; summary: { violations: IViolation[] } } };

  return {
    modules: result.output.modules,
    violations: result.output.summary.violations,
  };
}

export interface CruiseResult {
  modules: ModuleRecord[];
  violations: IViolation[];
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
