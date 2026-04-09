import type { ContextKey, FutureSettleKey, ScopeRef } from "#/contracts";
import { contextKey, messageKey } from "#/contracts";
import type { ScopeFailure } from "#/failures";

export const resumableDelegateKey: ContextKey<ScopeRef<unknown>> = contextKey<ScopeRef<unknown>>();

export interface ResumableRecoveryRequest<Relic> {
  readonly failure: ScopeFailure;
  readonly recoverySettle: FutureSettleKey<Relic>;
}

export const resumableFailureKey = messageKey<ResumableRecoveryRequest<unknown>>();
