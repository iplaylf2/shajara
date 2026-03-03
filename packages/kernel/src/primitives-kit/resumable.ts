import type { ContextKey, Failure, ScopeRef } from "#src/contracts";
import { channel, contextKey } from "#src/contracts";
import type { Either } from "fp-ts/Either";

export const resumableDelegateKey: ContextKey<ScopeRef<unknown>> = contextKey<ScopeRef<unknown>>();

export const resumableFailureChannel = channel<Failure>();
export const resumableRecoveryChannel = channel<Either<Failure, unknown>>();
