import type { ProcessRef } from "#/contracts";

export interface ScopeZone {
  trackProcess(process: ProcessRef<unknown>): void;
}
