import type { RuntimeBlueprint } from "#src/contracts";
import { notImplemented } from "#src/internal/not-implemented";

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
  return notImplemented("creating a host-managed scope with run()/halt() lifecycle controls");
}
