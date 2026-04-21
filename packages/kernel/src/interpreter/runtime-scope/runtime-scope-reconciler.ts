// oxlint-disable no-magic-numbers
import type { ScopeRef, Suppressor } from "#/contracts";
import type { ScopeSync, ScopeSyncEffect, ScopeSyncNotification } from "./runtime-scope";

export class RuntimeScopeReconciler {
  public reconcile<Result>(
    scope: ScopeRef<unknown>,
    sync: ScopeSync<Result>,
    suppressor: Suppressor,
  ): Result {
    const call = createScopeSyncCall(scope, sync, suppressor);

    this.#pendingCalls.push(call);
    this.#takeOverUntil(call);

    return call.result! as Result;
  }

  #takeOverUntil(target: ScopeSyncCall): void {
    while (this.#isQueued(target)) {
      this.#drive(this.#nextPendingCall());
    }
  }

  #drive(call: ScopeSyncCall): void {
    this.#drivingCall = call;

    while (this.#drivingCall === call) {
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
      case "flush": {
        this.#handoff(call, () => this.#flushNotifications(call));
        break;
      }
      case "notify": {
        call.notifications.push(step.notification);
        break;
      }
      case "syncScope": {
        if (this.#hasPendingSyncFor(step.scope)) {
          break;
        }

        this.#handoff(call, () => {
          this.#inlineScopeSync(call, step.scope, step.sync());
        });
        break;
      }
      case "track": {
        this.#handoff(call, () => {
          step.task(call.suppressor);
        });
        break;
      }
    }
  }

  #handoff(call: ScopeSyncCall, effect: () => void): void {
    this.#drivingCall = null;
    effect();

    if (!this.#isQueued(call)) {
      return;
    }

    this.#drivingCall = call;
  }

  #inlineScopeSync(parent: ScopeSyncCall, scope: ScopeRef<unknown>, sync: ScopeSync<void>): void {
    const call = createScopeSyncCall(scope, sync, parent.suppressor);
    const parentIndex = this.#pendingCalls.indexOf(parent);

    this.#pendingCalls.splice(parentIndex, 0, call);
    this.#takeOverUntil(call);
  }

  #finish(call: ScopeSyncCall, result: unknown): void {
    call.result = result;
    this.#drivingCall = null;
    this.#dequeue(call);
  }

  // oxlint-disable-next-line class-methods-use-this
  #flushNotifications(call: ScopeSyncCall): void {
    const { notifications } = call;
    call.notifications = [];

    for (const notification of notifications) {
      notification(call.suppressor);
    }
  }

  #nextPendingCall(): ScopeSyncCall {
    return this.#pendingCalls.find((call) => call !== this.#drivingCall)!;
  }

  #isQueued(target: ScopeSyncCall): boolean {
    return this.#pendingCalls.includes(target);
  }

  #hasPendingSyncFor(scope: ScopeRef<unknown>): boolean {
    return this.#pendingCalls.some((call) => call.scope === scope);
  }

  #dequeue(target: ScopeSyncCall): void {
    const index = this.#pendingCalls.indexOf(target);
    if (index >= 0) {
      this.#pendingCalls.splice(index, 1);
    }
  }

  readonly #pendingCalls: ScopeSyncCall[] = [];
  #drivingCall: ScopeSyncCall | null = null;
}

function createScopeSyncCall<Result>(
  scope: ScopeRef<unknown>,
  sync: ScopeSync<Result>,
  suppressor: Suppressor,
): ScopeSyncCall {
  return {
    next: () => sync.next() as IteratorResult<ScopeSyncEffect, unknown>,
    notifications: [],
    result: null,
    scope,
    suppressor,
  };
}

interface ScopeSyncCall {
  notifications: ScopeSyncNotification[];
  result: unknown | null;
  readonly scope: ScopeRef<unknown>;
  next(): IteratorResult<ScopeSyncEffect, unknown>;
  readonly suppressor: Suppressor;
}
