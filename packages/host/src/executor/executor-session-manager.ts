import type { Executor } from "@shajara/kernel";
import { ExecutorSession } from "./executor-session.js";

export function acquireExecutorLease(): ExecutorLease {
  return executorSessionManager().acquireLease();
}

export interface ExecutorLease extends Disposable {
  readonly executor: Executor;
}

function executorSessionManager(): ExecutorSessionManager {
  if (sessionManagerSingleton) {
    return sessionManagerSingleton;
  }

  sessionManagerSingleton = new ExecutorSessionManager();

  return sessionManagerSingleton;
}

class ExecutorSessionManager {
  public acquireLease(): ExecutorLease {
    const session = this.#session ?? this.#startSession();
    this.#leaseCount += 1;

    let isDisposed = false;
    return {
      executor: session.executor,
      [Symbol.dispose]: () => {
        if (isDisposed) {
          return;
        }

        isDisposed = true;
        this.#leaseCount -= 1;
        if (this.#leaseCount === NO_LEASE_COUNT) {
          this.#endSession(session);
        }
      },
    };
  }

  #startSession(): ExecutorSession {
    const session = new ExecutorSession();
    this.#session = session;

    return session;
  }

  #endSession(session: ExecutorSession): void {
    this.#session = null;
    session[Symbol.dispose]();
  }

  #leaseCount = NO_LEASE_COUNT;
  #session: ExecutorSession | null = null;
}

let sessionManagerSingleton: ExecutorSessionManager | null = null;

const NO_LEASE_COUNT = 0;
