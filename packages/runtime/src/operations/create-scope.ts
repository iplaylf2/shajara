import type { RuntimeBlueprint } from "#src/contracts";
import { awaitExecution } from "#src/operations-kit/await-execution";
import { ensureExecutor } from "@khora/kernel";
import { lowerPlan } from "#src/adapter/plan-lower";

export interface RuntimeScope {
  run<ReturnValue>(runtimeBlueprint: RuntimeBlueprint<ReturnValue>): Promise<ReturnValue>;
  halt(): Promise<void>;
  readonly state: RuntimeScopeState;
  readonly closed: Promise<RuntimeScopeCloseResult>;
  [Symbol.asyncDispose](): Promise<void>;
}

export type RuntimeScopeState = "open" | "closing" | "closed";
export type RuntimeScopeCloseResult =
  | { readonly status: "completed" }
  | { readonly status: "failed"; readonly reason: unknown };

interface CloseController {
  readonly closed: Promise<RuntimeScopeCloseResult>;
  readonly isClosed: () => boolean;
  readonly settleCompleted: () => void;
  readonly settleFailed: (reason: unknown) => void;
}

const CLOSE_POLL_INTERVAL_MS = 10;

function createCloseController(onClosed: () => void): CloseController {
  let closeResult: RuntimeScopeCloseResult | null = null;
  let resolveClosed: ((result: RuntimeScopeCloseResult) => void) | null = null;

  const settle = (result: RuntimeScopeCloseResult): void => {
    if (closeResult !== null) {
      return;
    }
    closeResult = result;
    onClosed();
    if (resolveClosed !== null) {
      resolveClosed(result);
    }
  };
  const closed = new Promise<RuntimeScopeCloseResult>((resolve): void => {
    resolveClosed = resolve;
  });

  return {
    closed,
    isClosed: (): boolean => closeResult !== null,
    settleCompleted: (): void => settle({ status: "completed" }),
    settleFailed: (reason: unknown): void => settle({ reason, status: "failed" }),
  };
}

function observeScopeClose(
  readState: () => RuntimeScopeState,
  onState: (state: RuntimeScopeState) => void,
  onClosed: () => void,
): Promise<void> {
  return new Promise<void>((resolve) => {
    const tick = (): void => {
      const state = readState();
      onState(state);
      if (state === "closed") {
        onClosed();
        resolve();
        return;
      }
      globalThis.setTimeout(tick, CLOSE_POLL_INTERVAL_MS);
    };
    tick();
  });
}

export function createScope(): RuntimeScope {
  const executor = ensureExecutor();
  const scope = executor.createScope();
  let runtimeState: RuntimeScopeState = scope.state();
  const close = createCloseController((): void => {
    runtimeState = "closed";
  });
  const closedSignal = observeScopeClose(
    (): RuntimeScopeState => scope.state(),
    (state: RuntimeScopeState): void => {
      runtimeState = state;
    },
    close.settleCompleted,
  );
  let haltPromise: Promise<void> | null = null;
  return {
    [Symbol.asyncDispose](): Promise<void> {
      return haltScope();
    },
    closed: close.closed,
    halt: haltScope,
    run<ReturnValue>(runtimeBlueprint: RuntimeBlueprint<ReturnValue>): Promise<ReturnValue> {
      return awaitExecution(executor.launch(scope.ref, () => lowerPlan(runtimeBlueprint())));
    },
    get state(): RuntimeScopeState {
      return runtimeState;
    },
  };
  function haltScope(): Promise<void> {
    if (haltPromise !== null) {
      return haltPromise;
    }
    if (close.isClosed()) {
      return Promise.resolve();
    }
    runtimeState = "closing";
    haltPromise = Promise.resolve()
      .then((): void => executor.terminate(scope.ref))
      .then(
        (): Promise<void> => closedSignal,
        (reason: unknown): never => {
          close.settleFailed(reason);
          throw reason;
        },
      );
    return haltPromise;
  }
}
