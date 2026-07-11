import type { ProcessRef, ScopeRef } from "#/contracts/index.js";
import type { RuntimeProcessKeeper } from "./keeper.js";
import type { RuntimeProcessRunner } from "./runner.js";

export interface RuntimeProcessHandle<Relic> extends ProcessRef<Relic> {
  keeper(): RuntimeProcessKeeper;
  runner(): RuntimeProcessRunner<Relic>;
  readonly scopeRef: ScopeRef<unknown>;
}
