export function buildExplorerCodeBlockId(exampleId: string): string {
  return `explorer-${exampleId}-code`;
}

export interface HostConcurrencyStage {
  kind: "host-concurrency";
}

export type ExplorerStage = HostConcurrencyStage;
