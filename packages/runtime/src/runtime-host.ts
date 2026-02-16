import { ROOT_SCOPE_HANDLE, postScopeInput } from "./runtime-state";
import type { RuntimeBlueprint } from "./blueprint";
import type { ScopeHandle } from "./runtime-state";
import { runBlueprint } from "./runtime-runner";

const ROOT_SCOPE: ScopeHandle = ROOT_SCOPE_HANDLE;

function post(scopeHandle: ScopeHandle, inputValue: unknown): void {
  postScopeInput(scopeHandle, inputValue);
}

function run<ReturnValue>(
  runtimeBlueprint: RuntimeBlueprint<ReturnValue>,
): Promise<ReturnValue> {
  return runBlueprint(runtimeBlueprint);
}

export type { ScopeHandle };
export { post, ROOT_SCOPE, run };
