import type { REF_TOKEN, RELIC_TOKEN } from "./token";
import type { Failure } from "./failure";

export interface ScopeRef<Relic> {
  readonly [REF_TOKEN]: "scope";
  readonly [RELIC_TOKEN]?: readonly [Relic];
}

export interface ScopeSpec {
  readonly role: string;
}

export type ScopeRefRelic<Ref extends ScopeRef<unknown>> =
  Ref extends ScopeRef<infer Relic> ? Relic : never;

export interface ScopeCompletedExit<Relic> {
  readonly kind: "completed";
  readonly value: Relic;
}

export interface ScopeFailedExit {
  readonly kind: "failed";
  readonly failure: Failure;
}

export interface ScopeTerminatedExit {
  readonly kind: "terminated";
}

export type ScopeExit<Relic> = ScopeCompletedExit<Relic> | ScopeFailedExit | ScopeTerminatedExit;
