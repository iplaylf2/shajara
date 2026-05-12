// oxlint-disable no-magic-numbers
import type { ScopeRef, Suppressor } from "#/contracts";
import type { TaggedUnion } from "type-fest";

export class RuntimeScopeReconciler {
  public reconcile<Result>(
    scope: ScopeRef<unknown>,
    sync: ScopeSync<Result>,
    suppressor: Suppressor,
  ): Result {
    const call = createScopeSyncCall(scope, sync, suppressor);

    this.#queuedCalls.push(call);
    this.#takeOverUntil(call);

    return call.result! as Result;
  }

  #takeOverUntil(target: ScopeSyncCall): void {
    while (this.#isQueued(target)) {
      this.#drive(this.#nextQueuedCall());
    }
  }

  #drive(call: ScopeSyncCall): void {
    this.#acquire(call);
    this.#activeCall = call;

    while (this.#activeCall === call) {
      const next = call.next();
      if (next.done) {
        this.#finish(call, next.value);
        return;
      }

      this.#applyStep(call, next.value);
    }
  }

  #applyStep(call: ScopeSyncCall, step: ScopeSyncEffect): void {
    switch (step.kind) {
      case "converge": {
        this.#convergeScope(call.scope, call);
        break;
      }
      case "defer": {
        call.deferredTasks.push(step.task);
        break;
      }
      case "handoff": {
        this.#handoff(call, () => {
          step.task(call.suppressor);
        });
        break;
      }
      case "signal": {
        this.#signalScope(call, step);
        break;
      }
    }
  }

  #finish(call: ScopeSyncCall, result: unknown): void {
    call.result = result;
    this.#activeCall = null;
    this.#release(call);
    this.#dequeue(call);
  }

  #handoff(call: ScopeSyncCall, effect: () => void): void {
    this.#activeCall = null;
    this.#release(call);
    effect();

    if (!this.#isQueued(call)) {
      return;
    }

    this.#acquire(call);
    this.#activeCall = call;
  }

  #signalScope(parent: ScopeSyncCall, signal: ScopeSignalRequest): void {
    if (this.#acquiredScopes.has(signal.scope)) {
      return;
    }

    this.#takeover(parent, () => this.#inlineScopeSignal(parent, signal.scope, signal.run));
  }

  #takeover(call: ScopeSyncCall, effect: () => void): void {
    this.#activeCall = null;
    effect();

    if (!this.#isQueued(call)) {
      return;
    }

    this.#activeCall = call;
  }

  #inlineScopeSignal(
    parent: ScopeSyncCall,
    scope: ScopeRef<unknown>,
    run: () => ScopeSync<void>,
  ): void {
    const call = createScopeSyncCall(scope, run(), parent.suppressor);
    const parentIndex = this.#queuedCalls.indexOf(parent);

    this.#queuedCalls.splice(parentIndex, 0, call);
    this.#takeOverUntil(call);
  }

  #acquire(call: ScopeSyncCall): void {
    this.#acquiredScopes.add(call.scope);
  }

  #release(call: ScopeSyncCall): void {
    this.#acquiredScopes.delete(call.scope);
    this.#flushDeferredTasks(call);
  }

  #convergeScope(scope: ScopeRef<unknown>, continuingCall: ScopeSyncCall): void {
    const continuingIndex = this.#queuedCalls.indexOf(continuingCall);
    for (let index = this.#queuedCalls.length - 1; index > continuingIndex; index -= 1) {
      const call = this.#queuedCalls[index]!;
      if (call.scope === scope) {
        this.#queuedCalls.splice(index, 1);
      }
    }
  }

  #nextQueuedCall(): ScopeSyncCall {
    return this.#queuedCalls.find((call) => call !== this.#activeCall)!;
  }

  #isQueued(target: ScopeSyncCall): boolean {
    return this.#queuedCalls.includes(target);
  }

  #dequeue(target: ScopeSyncCall): void {
    const index = this.#queuedCalls.indexOf(target);
    if (index !== -1) {
      this.#queuedCalls.splice(index, 1);
    }
  }

  // oxlint-disable-next-line class-methods-use-this
  #flushDeferredTasks(call: ScopeSyncCall): void {
    const { deferredTasks } = call;
    call.deferredTasks = [];

    for (const task of deferredTasks) {
      task(call.suppressor);
    }
  }

  readonly #queuedCalls: ScopeSyncCall[] = [];
  readonly #acquiredScopes = new Set<ScopeRef<unknown>>();
  #activeCall: ScopeSyncCall | null = null;
}

export type ScopeSync<Result> = Generator<ScopeSyncEffect, Result, void>;

export type ScopeSyncEffect = TaggedUnion<
  "kind",
  {
    converge: {};
    defer: {
      readonly task: ScopeReleaseTask;
    };
    handoff: {
      readonly task: ScopeReleaseTask;
    };
    signal: {
      readonly run: () => ScopeSync<void>;
      readonly scope: ScopeRef<unknown>;
    };
  }
>;

export type ScopeReleaseTask = (suppressor: Suppressor) => void;

function createScopeSyncCall<Result>(
  scope: ScopeRef<unknown>,
  sync: ScopeSync<Result>,
  suppressor: Suppressor,
): ScopeSyncCall {
  return {
    deferredTasks: [],
    next: () => sync.next() as IteratorResult<ScopeSyncEffect, unknown>,
    result: null,
    scope,
    suppressor,
  };
}

interface ScopeSyncCall {
  deferredTasks: ScopeReleaseTask[];
  result: unknown | null;
  readonly scope: ScopeRef<unknown>;
  next(): IteratorResult<ScopeSyncEffect, unknown>;
  readonly suppressor: Suppressor;
}

type ScopeSignalRequest = Extract<ScopeSyncEffect, { readonly kind: "signal" }>;
