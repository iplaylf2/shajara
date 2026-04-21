// oxlint-disable no-magic-numbers
import type { RuntimeSync, RuntimeSyncNotification, RuntimeSyncStep } from "./runtime-scope";
import type { ScopeRef, Suppressor } from "#/contracts";

export class RuntimeScopeReconciler {
  public reconcile<Result>(
    scope: ScopeRef<unknown>,
    sync: RuntimeSync<Result>,
    suppressor: Suppressor,
  ): Result {
    const call = runtimeSyncCall(scope, sync, suppressor);

    this.#pendingCalls.push(call);
    this.#takeOverUntil(call);

    return call.result! as Result;
  }

  #takeOverUntil(target: RuntimeSyncCall): void {
    while (this.#isQueued(target)) {
      this.#drive(this.#nextPendingCall());
    }
  }

  #drive(call: RuntimeSyncCall): void {
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

  #applyStep(call: RuntimeSyncCall, step: RuntimeSyncStep): void {
    switch (step.kind) {
      case "flush": {
        this.#handoff(call, () => this.#flushNotifications(call));
        break;
      }
      case "notify": {
        call.notifications.push(step.notification);
        break;
      }
      case "sync-scope": {
        if (this.#hasPendingCall(step.scope)) {
          break;
        }

        this.#handoff(call, () => {
          this.#syncScope(call, step.scope, step.sync());
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

  #handoff(call: RuntimeSyncCall, effect: () => void): void {
    this.#drivingCall = null;
    effect();

    if (!this.#isQueued(call)) {
      return;
    }

    this.#drivingCall = call;
  }

  #syncScope(parent: RuntimeSyncCall, scope: ScopeRef<unknown>, sync: RuntimeSync<void>): void {
    const call = runtimeSyncCall(scope, sync, parent.suppressor);
    const parentIndex = this.#pendingCalls.indexOf(parent);

    this.#pendingCalls.splice(parentIndex, 0, call);
    this.#takeOverUntil(call);
  }

  #finish(call: RuntimeSyncCall, result: unknown): void {
    call.result = result;
    this.#drivingCall = null;
    this.#dequeue(call);
  }

  // oxlint-disable-next-line class-methods-use-this
  #flushNotifications(call: RuntimeSyncCall): void {
    const { notifications } = call;
    call.notifications = [];

    for (const notification of notifications) {
      notification(call.suppressor);
    }
  }

  #nextPendingCall(): RuntimeSyncCall {
    return this.#pendingCalls.find((call) => call !== this.#drivingCall)!;
  }

  #isQueued(target: RuntimeSyncCall): boolean {
    return this.#pendingCalls.includes(target);
  }

  #hasPendingCall(scope: ScopeRef<unknown>): boolean {
    return this.#pendingCalls.some((call) => call.scope === scope);
  }

  #dequeue(target: RuntimeSyncCall): void {
    const index = this.#pendingCalls.indexOf(target);
    if (index >= 0) {
      this.#pendingCalls.splice(index, 1);
    }
  }

  readonly #pendingCalls: RuntimeSyncCall[] = [];
  #drivingCall: RuntimeSyncCall | null = null;
}

function runtimeSyncCall<Result>(
  scope: ScopeRef<unknown>,
  sync: RuntimeSync<Result>,
  suppressor: Suppressor,
): RuntimeSyncCall {
  return {
    next: () => sync.next() as IteratorResult<RuntimeSyncStep, unknown>,
    notifications: [],
    result: null,
    scope,
    suppressor,
  };
}

interface RuntimeSyncCall {
  notifications: RuntimeSyncNotification[];
  result: unknown | null;
  readonly scope: ScopeRef<unknown>;
  next(): IteratorResult<RuntimeSyncStep, unknown>;
  readonly suppressor: Suppressor;
}
