import type { ScopeRef, Suppressor } from "#/contracts";
import type { RuntimeSync } from "./runtime-scope";

export class RuntimeScopeReconciler {
  // oxlint-disable-next-line class-methods-use-this
  public reconcile<Result>(
    _scope: ScopeRef<unknown>,
    _sync: RuntimeSync<Result>,
    _suppressor: Suppressor,
  ): Result {
    throw new Error("TODO: implement RuntimeScopeReconciler.reconcile");
  }
}
