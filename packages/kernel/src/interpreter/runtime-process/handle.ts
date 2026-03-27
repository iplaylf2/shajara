import type { ProcessRef, ScopeRef } from "#/contracts";
import type { RuntimeProcessKeeper } from "./keeper";
import type { RuntimeProcessRunner } from "./runner";

export interface RuntimeProcessHandle<Relic> extends ProcessRef<Relic> {
  keeper(): RuntimeProcessKeeper;
  runner(): RuntimeProcessRunner<Relic>;
  readonly scopeRef: ScopeRef<unknown>;
}
