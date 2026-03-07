import type { Failure, Ritual, ScopeRef, Wisp } from "#src/contracts";
import {
  awaitScopeConverged,
  awaitScopeInBand,
  resumableDelegateKey,
  resumableFailureChannel,
  resumableRecoveryChannel,
} from "#src/primitives-kit";
import { lookup, receive, send, spawn } from "#src/sigils";
import { wisp, wispEither, wispOption } from "#src/internal/fp";
import type { Either } from "#src/utils";
import { narrowAs } from "#src/utils";
import { pipe } from "fp-ts/function";
import { supervisorScopeSpec } from "#src/scopes";

export function resumable<Return>(entry: Ritual<Return>): Wisp<Either<Failure, Return>> {
  return pipe(
    spawn(entry, supervisorScopeSpec()),
    wisp.liftF,
    wisp.chain(({ scopeRef }) => awaitScopeConverged(scopeRef)),
    wispEither.orElse((failure) =>
      pipe(
        lookup(resumableDelegateKey),
        wisp.liftF,
        wispOption.matchE(
          () => wispEither.left(failure),
          (delegateScopeRef) =>
            pipe(
              spawn(delegateWorker<Return>(delegateScopeRef, failure)),
              wisp.liftF,
              wisp.chain(({ scopeRef }) => awaitScopeInBand(scopeRef)),
            ),
        ),
      ),
    ),
  );
}

function delegateWorker<Return>(
  delegateScopeRef: ScopeRef<unknown>,
  failure: Failure,
): Ritual<Either<Failure, Return>> {
  return () =>
    pipe(
      send(delegateScopeRef, resumableFailureChannel, failure),
      wisp.liftF,
      wisp.chainF(() => receive(resumableRecoveryChannel)),
      wisp.map(({ value }) => value),
      wisp.map(narrowAs<Either<Failure, Return>>()),
    );
}
