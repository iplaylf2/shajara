import type { RuntimeBlueprint } from "./blueprint";
import type { RuntimePlan } from "./runtime-kit/runtime-protocol";
import type { RuntimeSpawnRef } from "./runtime-kit/runtime-entities";
import { notImplementedRuntimePrimitive } from "./runtime-kit/not-implemented";
import { runBlueprint } from "./runtime-runner";

interface RuntimeAction<ReturnValue> {
  readonly scope: RuntimeSpawnRef<ReturnValue>;
  resolve(value: ReturnValue): void;
  reject(reason: unknown): void;
}

type RuntimeUntilThunk<ReturnValue> = () => PromiseLike<ReturnValue>;

function run<ReturnValue>(runtimeBlueprint: RuntimeBlueprint<ReturnValue>): Promise<ReturnValue> {
  return runBlueprint(runtimeBlueprint);
}

function action<ReturnValue>(): RuntimeAction<ReturnValue> {
  throw new Error(
    "Not implemented: creating a host-level runtime action capability with scope/resolve/reject.",
  );
}

function sleep(_milliseconds: number): RuntimePlan<void> {
  return notImplementedRuntimePrimitive("sleep");
}

function until<ReturnValue>(_thunk: RuntimeUntilThunk<ReturnValue>): RuntimeSpawnRef<ReturnValue> {
  throw new Error(
    "Not implemented: creating a runtime scope that resolves/rejects from a host promise thunk.",
  );
}

export { action, run, sleep, until };
export type { RuntimeAction, RuntimeUntilThunk };
