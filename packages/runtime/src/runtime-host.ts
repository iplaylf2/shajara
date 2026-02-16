import type { RuntimeBlueprint } from "./blueprint";
import { runBlueprint } from "./runtime-runner";

const SCOPE_HANDLE_TOKEN: unique symbol = Symbol("scope-handle");

interface ScopeHandle {
  readonly [SCOPE_HANDLE_TOKEN]: "scope-handle";
}

const ROOT_SCOPE = {} as ScopeHandle;

function post(_scopeHandle: ScopeHandle, _inputValue: unknown): void {
  throw new Error("Not implemented: posting host input to runtime scope.");
}

function run<ReturnValue>(runtimeBlueprint: RuntimeBlueprint<ReturnValue>): Promise<ReturnValue> {
  return runBlueprint(runtimeBlueprint);
}

export type { ScopeHandle };
export { post, ROOT_SCOPE, run };
