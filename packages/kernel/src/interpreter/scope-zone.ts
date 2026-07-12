import type { ProcessRef, ScopeRef, Suppressor } from "#/contracts/index.js";

export interface ScopeZone {
  trackProcess: (process: ProcessRef<unknown>, suppressor: Suppressor) => void;
  trackScope: (scope: ScopeRef<unknown>, suppressor: Suppressor) => void;
}
