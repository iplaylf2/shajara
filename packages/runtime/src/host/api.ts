import type { RuntimeBlueprint } from "#src/bridge/blueprint";
import type { RuntimePlan } from "#src/contracts/plan";
import type { RuntimeSpawnRef } from "#src/contracts/entities";
import { notImplementedRuntimePrimitive } from "#src/internal/not-implemented";
import { runBlueprint } from "./runner";

interface RuntimeAction<ReturnValue> {
  readonly scope: RuntimeSpawnRef<ReturnValue>;
  resolve(value: ReturnValue): void;
  reject(reason: unknown): void;
}

interface RuntimeScope {
  run<ReturnValue>(runtimeBlueprint: RuntimeBlueprint<ReturnValue>): Promise<ReturnValue>;
  halt(): Promise<void>;
  readonly state: RuntimeScopeState;
  readonly closed: Promise<RuntimeScopeCloseResult>;
  [Symbol.asyncDispose](): Promise<void>;
}

type RuntimeUntilThunk<ReturnValue> = () => PromiseLike<ReturnValue>;
type RuntimeScopeState = "open" | "closing" | "closed";
type RuntimeScopeCloseResult =
  | { readonly status: "completed" }
  | { readonly status: "failed"; readonly reason: unknown };

function run<ReturnValue>(runtimeBlueprint: RuntimeBlueprint<ReturnValue>): Promise<ReturnValue> {
  return runBlueprint(runtimeBlueprint);
}

function createScope(): RuntimeScope {
  throw new Error(
    "Not implemented: creating a host-managed scope with run()/halt() lifecycle controls.",
  );
}

function action<ReturnValue>(): RuntimePlan<RuntimeAction<ReturnValue>> {
  return notImplementedRuntimePrimitive("action");
}

function sleep(_milliseconds: number): RuntimePlan<void> {
  return notImplementedRuntimePrimitive("sleep");
}

function until<ReturnValue>(_thunk: RuntimeUntilThunk<ReturnValue>): RuntimeSpawnRef<ReturnValue> {
  throw new Error(
    "Not implemented: creating a runtime scope that resolves/rejects from a host promise thunk.",
  );
}

export { action, run, sleep, until, createScope };
export type {
  RuntimeAction,
  RuntimeScope,
  RuntimeScopeCloseResult,
  RuntimeScopeState,
  RuntimeUntilThunk,
};
