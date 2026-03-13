import type { ContextKey, FailureShape, FutureSettleKey, ScopeRef } from "#src/contracts";
import { contextKey, messageKey } from "#src/contracts";

export const resumableDelegateKey: ContextKey<ScopeRef<unknown>> = contextKey<ScopeRef<unknown>>();

export interface ResumableRecoveryRequest<Relic> {
  readonly failure: FailureShape;
  readonly recoverySettle: FutureSettleKey<Relic>;
}

export const resumableFailureKey = messageKey<ResumableRecoveryRequest<unknown>>();
