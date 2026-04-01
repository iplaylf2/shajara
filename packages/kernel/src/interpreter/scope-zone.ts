import type { ProcessRef, ScopeRef } from "#/contracts";

export interface ScopeZone {
  trackProcess(process: ProcessRef<unknown>): void;
  trackScope(scope: ScopeRef<unknown>): void;
}
