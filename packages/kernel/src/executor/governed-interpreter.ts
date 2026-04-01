import { Interpreter } from "#/interpreter";
import type { ScopeDescriptor } from "#/sigils";
import type { ScopeZone } from "#/interpreter";
import { notImplemented } from "#/internal/not-implemented";

export class GovernedInterpreter extends Interpreter {
  // oxlint-disable-next-line class-methods-use-this
  protected override branchZone(_parentZone: ScopeZone, _descriptor: ScopeDescriptor): ScopeZone {
    return notImplemented("");
  }
}
