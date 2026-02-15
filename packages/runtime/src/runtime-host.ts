import { ROOT_SCOPE_HANDLE, postScopeInput } from "./runtime-state";
import type { Blueprint } from "./blueprint";
import { runBlueprint } from "./runtime-runner";

type ScopeHandle = import("./runtime-state").ScopeHandle;

const ROOT_SCOPE: ScopeHandle = ROOT_SCOPE_HANDLE;

function post(scopeHandle: ScopeHandle, inputValue: unknown): void {
  postScopeInput(scopeHandle, inputValue);
}

function run<ReturnValue>(blueprint: Blueprint<ReturnValue>): Promise<ReturnValue> {
  return runBlueprint(blueprint);
}

export type { ScopeHandle };
export { post, ROOT_SCOPE, run };
