import type { FutureHandle, ProcessState, ProcessWrap } from "#src/interpreter";
import type { FutureKey, ProcessRef, Ritual, ScopeRef } from "#src/contracts";
import { Interpreter } from "#src/interpreter";
import { notImplemented } from "#src/internal/not-implemented";

export class DomainInterpreter extends Interpreter {
  public constructor() {
    super(() => notImplemented(`creating the default entry ritual for ${DomainInterpreter.name}`));
  }

  public override perform<Relic>(_process: ProcessRef<Relic>): ProcessState<Relic> {
    return notImplemented(`performing a process in ${this.constructor.name}`);
  }

  public override spawn<Relic>(
    _scope: ScopeRef<unknown>,
    _worker: Ritual<Relic>,
  ): ProcessRef<Relic> {
    return notImplemented(`spawning a process in ${this.constructor.name}`);
  }

  public override observe<Result>(_future: FutureKey<Result>): FutureHandle<Result> {
    return notImplemented(`observing a future in ${this.constructor.name}`);
  }

  protected override onReady(_processWrap: ProcessWrap<unknown>): void {
    return notImplemented(`handling a ready process in ${this.constructor.name}`);
  }
}
