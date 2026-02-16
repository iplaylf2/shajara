import type { RuntimeBlueprint } from "./blueprint";
import { runBlueprint } from "./runtime-runner";
import type { RuntimeSpawnRef } from "./runtime-kit/runtime-entities";

interface RuntimeAction<ReturnValue> {
  readonly scope: RuntimeSpawnRef<ReturnValue>;
  resolve(value: ReturnValue): void;
  reject(reason: unknown): void;
}

function run<ReturnValue>(runtimeBlueprint: RuntimeBlueprint<ReturnValue>): Promise<ReturnValue> {
  return runBlueprint(runtimeBlueprint);
}

function action<ReturnValue>(): RuntimeAction<ReturnValue> {
  throw new Error(
    "Not implemented: creating a host-level runtime action capability with scope/resolve/reject.",
  );
}

export { action, run };
export type { RuntimeAction };
