import type { Blueprint, Failure, Plan, ScopeRef } from "#src/contracts";
import {
  awaitScopeConverged,
  awaitScopeInBand,
  resumableDelegateKey,
  resumableFailureChannel,
  resumableRecoveryChannel,
} from "#src/primitives-kit";
import { lookup, receive, send, spawn } from "#src/syscalls";
import { plan, planEither, planOption } from "#src/internal/fp";
import type { Either } from "#src/utils";
import { narrowAs } from "#src/utils";
import { pipe } from "fp-ts/function";
import { supervisorScopeSpec } from "#src/scopes";

export function resumable<Return>(entry: Blueprint<Return>): Plan<Either<Failure, Return>> {
  return pipe(
    spawn(entry, supervisorScopeSpec()),
    plan.liftF,
    plan.chain(({ scopeRef }) => awaitScopeConverged(scopeRef)),
    planEither.orElse((failure) =>
      pipe(
        lookup(resumableDelegateKey),
        plan.liftF,
        planOption.matchE(
          () => planEither.left(failure),
          (delegateScopeRef) =>
            pipe(
              spawn(delegateWorker<Return>(delegateScopeRef, failure)),
              plan.liftF,
              plan.chain(({ scopeRef }) => awaitScopeInBand(scopeRef)),
            ),
        ),
      ),
    ),
  );
}

function delegateWorker<Return>(
  delegateScopeRef: ScopeRef<unknown>,
  failure: Failure,
): Blueprint<Either<Failure, Return>> {
  return () =>
    pipe(
      send(delegateScopeRef, resumableFailureChannel, failure),
      plan.liftF,
      plan.chainF(() => receive(resumableRecoveryChannel)),
      plan.map(({ value }) => value),
      plan.map(narrowAs<Either<Failure, Return>>()),
    );
}
