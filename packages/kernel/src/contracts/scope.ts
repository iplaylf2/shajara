import type { KhoraFailure } from "./failure";
import { REF_TOKEN } from "#src/utils/ref";

export interface ScopeRef<Return> {
  readonly [REF_TOKEN]: "scope";
  readonly return?: readonly [Return];
}

export interface ScopeSpec {
  readonly role: string;
}

export type ScopeRefReturn<Ref extends ScopeRef<unknown>> =
  Ref extends ScopeRef<infer Return> ? Return : never;

export interface ScopeTerminatedFailure extends KhoraFailure {
  readonly kind: "scope-terminated";
  readonly scopeRef: ScopeRef<unknown>;
}

export function scopeTerminated(scopeRef: ScopeRef<unknown>): ScopeTerminatedFailure {
  return {
    kind: "scope-terminated",
    message(): string {
      return "Scope terminated before completion";
    },
    scopeRef,
  };
}
