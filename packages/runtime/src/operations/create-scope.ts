import type { RuntimeBlueprint } from "#src/contracts";
import { ensureExecutor } from "@khora/kernel";
import { launchRuntimeBlueprintInScope } from "#src/operations-kit/launch-runtime-blueprint";

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

export function createScope(): RuntimeScope {
  const scope = ensureExecutor().createScope();
  const closed = new Promise<RuntimeScopeCloseResult>((resolve) => {
    scope.onClose(resolve);
  });

  return {
    [Symbol.asyncDispose](): Promise<void> {
      return this.halt();
    },
    closed,
    async halt(): Promise<void> {
      scope.terminate();
      await closed;
    },
    run<ReturnValue>(runtimeBlueprint: RuntimeBlueprint<ReturnValue>): Promise<ReturnValue> {
      return launchRuntimeBlueprintInScope(scope.ref, runtimeBlueprint);
    },
    get state(): RuntimeScopeState {
      return scope.state();
    },
  };
}
