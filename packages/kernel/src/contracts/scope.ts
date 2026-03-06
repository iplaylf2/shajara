import type { REF_TOKEN, RETURN_TOKEN } from "#src/utils";
import type { Failure } from "./failure";

export interface ScopeRef<Return> {
  readonly [REF_TOKEN]: "scope";
  readonly [RETURN_TOKEN]?: readonly [Return];
}

export interface ScopeSpec {
  readonly role: string;
}

export type ScopeRefReturn<Ref extends ScopeRef<unknown>> =
  Ref extends ScopeRef<infer Return> ? Return : never;

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
