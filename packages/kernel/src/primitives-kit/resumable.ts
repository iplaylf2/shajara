import type { ContextKey, Failure, FutureSettleKey, ScopeRef } from "#src/contracts";
import { contextKey, messageKey } from "#src/contracts";
import type { Either } from "#src/utils";

export const resumableDelegateKey: ContextKey<ScopeRef<unknown>> = contextKey<ScopeRef<unknown>>();

export interface ResumableRecoveryRequest<Relic> {
  readonly failure: Failure;
  readonly recoverySettle: FutureSettleKey<Either<Failure, Relic>>;
}

export const resumableFailureMessageKey = messageKey<ResumableRecoveryRequest<unknown>>();
