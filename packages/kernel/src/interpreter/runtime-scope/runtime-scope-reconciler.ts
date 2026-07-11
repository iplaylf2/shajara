// oxlint-disable no-magic-numbers
import type { ScopeRef, Suppressor } from "#/contracts/index.js";
import type { TaggedUnion } from "type-fest";

export class RuntimeScopeReconciler {
  public reconcile(scope: ScopeRef<unknown>): void {
    while (this.#hasPendingCallFor(scope)) {
      this.#run(this.#nextPendingCall());
    }
  }

  public sync<Result>(
    scope: ScopeRef<unknown>,
    sync: ScopeSync<Result>,
    suppressor: Suppressor,
  ): Result {
    const call = this.#enqueue(createScopeSyncCall(scope, sync, suppressor));
    this.#run(call);

    return call.result! as Result;
  }

  #run(call: ScopeSyncCall): void {
    this.#activateCall(call);

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
    this.#dequeue(call);
    this.#releaseCall(call);
  }

  #handoff(call: ScopeSyncCall, effect: () => void): void {
    this.#activeCall = null;
    this.#releaseCall(call);
    effect();

    if (!this.#isPending(call)) {
      return;
    }

    this.#activateCall(call);
  }

  #signalScope(parent: ScopeSyncCall, signal: ScopeSignalRequest): void {
    if (this.#heldScopes.has(signal.scope)) {
      return;
    }

    this.#suspendCall(parent, () => this.#runSignal(parent, signal));
  }

  #suspendCall(call: ScopeSyncCall, effect: () => void): void {
    this.#activeCall = null;
    effect();

    if (!this.#isPending(call)) {
      return;
    }

    this.#activeCall = call;
  }

  #runSignal(parent: ScopeSyncCall, signal: ScopeSignalRequest): void {
    const call = createScopeSyncCall(signal.scope, signal.run(), parent.suppressor);
    this.#insertBefore(parent, call);
    this.#run(call);
  }

  #enqueue(call: ScopeSyncCall): ScopeSyncCall {
    this.#pendingCalls.push(call);
    return call;
  }

  #insertBefore(target: ScopeSyncCall, call: ScopeSyncCall): void {
    const targetIndex = this.#pendingCalls.indexOf(target);
    this.#pendingCalls.splice(targetIndex, 0, call);
  }

  #activateCall(call: ScopeSyncCall): void {
    this.#heldScopes.add(call.scope);
    this.#activeCall = call;
  }

  #releaseCall(call: ScopeSyncCall): void {
    this.#heldScopes.delete(call.scope);
    this.#flushDeferredTasks(call);
  }

  #nextPendingCall(): ScopeSyncCall {
    return this.#pendingCalls.find((call) => call !== this.#activeCall)!;
  }

  #hasPendingCallFor(scope: ScopeRef<unknown>): boolean {
    return this.#pendingCalls.some((call) => call.scope === scope);
  }

  #isPending(target: ScopeSyncCall): boolean {
    return this.#pendingCalls.includes(target);
  }

  #dequeue(target: ScopeSyncCall): void {
    const index = this.#pendingCalls.indexOf(target);
    if (index !== -1) {
      this.#pendingCalls.splice(index, 1);
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

  readonly #pendingCalls: ScopeSyncCall[] = [];
  readonly #heldScopes = new Set<ScopeRef<unknown>>();
  #activeCall: ScopeSyncCall | null = null;
}

export type ScopeSync<Result> = Generator<ScopeSyncEffect, Result, void>;

export type ScopeSyncEffect = TaggedUnion<
  "kind",
  {
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
