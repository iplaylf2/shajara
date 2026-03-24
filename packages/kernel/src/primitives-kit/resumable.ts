import type { ContextKey, FailureShape, FutureSettleKey, ScopeRef } from "#/contracts";
import { contextKey, messageKey } from "#/contracts";

export const resumableDelegateKey: ContextKey<ScopeRef<unknown>> = contextKey<ScopeRef<unknown>>();

export interface ResumableRecoveryRequest<Relic> {
  readonly failure: FailureShape;
  readonly recoverySettle: FutureSettleKey<Relic>;
}

export const resumableFailureKey = messageKey<ResumableRecoveryRequest<unknown>>();
