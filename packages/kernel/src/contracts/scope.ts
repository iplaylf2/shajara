import type { REF_TOKEN, RETURN_TOKEN } from "#src/utils";
import type { Failure } from "./failure";

declare const SCOPE_SPEC_TOKEN: unique symbol;

export interface ScopeRef<Return, Spec extends ScopeSpec = ScopeSpec> {
  readonly [REF_TOKEN]: "scope";
  readonly [SCOPE_SPEC_TOKEN]?: readonly [Spec];
  readonly [RETURN_TOKEN]?: readonly [Return];
}

export interface ScopeSpec {
  readonly role: string;
}

export type ScopeRefReturn<Ref extends ScopeRef<unknown>> =
  Ref extends ScopeRef<infer Return, infer _Spec> ? Return : never;

export interface ScopeCompletedExit<Return> {
  readonly kind: "completed";
  readonly value: Return;
}

export interface ScopeFailedExit {
  readonly kind: "failed";
  readonly failure: Failure;
}

export interface ScopeTerminatedExit {
  readonly kind: "terminated";
}

export type ScopeExit<Return> = ScopeCompletedExit<Return> | ScopeFailedExit | ScopeTerminatedExit;
