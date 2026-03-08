import type { ContextKey, Failure, ScopeRef } from "#src/contracts";
import { contextKey, messageKey } from "#src/contracts";
import type { Either } from "fp-ts/Either";

export const resumableDelegateKey: ContextKey<ScopeRef<unknown>> = contextKey<ScopeRef<unknown>>();

export const resumableFailureMessageKey = messageKey<Failure>();
export const resumableRecoveryMessageKey = messageKey<Either<Failure, unknown>>();
