import type { Failure, FutureKey, Ritual, ScopeRef, Wisp } from "#src/contracts";
import {
  awaitScopeInBand,
  forkFuture,
  resumableDelegateKey,
  resumableFailureMessageKey,
  resumableRecoveryMessageKey,
  unwrapScopeExit,
} from "#src/primitives-kit";
import { lookup, receive, send, spawn } from "#src/sigils";
import { wisp, wispEither, wispOption } from "#src/internal/fp";
import type { Either } from "#src/utils";
import { either } from "fp-ts";
import { narrowAs } from "#src/utils";
import { pipe } from "fp-ts/function";
import { supervisorScopeSpec } from "#src/scopes";

export function resumable<Relic>(entry: Ritual<Relic>): Wisp<FutureKey<Either<Failure, Relic>>> {
  return pipe(
    spawn(entry, supervisorScopeSpec()),
    wisp.liftF,
    wisp.chain(({ scopeRef }) =>
      forkFuture(scopeRef.exitFuture, (result) =>
        pipe(result.right, unwrapScopeExit, recoverResumable),
      ),
    ),
  );
}

function recoverResumable<Relic>(result: Either<Failure, Relic>): Wisp<Either<Failure, Relic>> {
  return pipe(
    result,
    either.match(
      (failure) =>
        pipe(
          lookup(resumableDelegateKey),
          wisp.liftF,
          wispOption.matchE(
            () => wispEither.left(failure),
            (delegateScopeRef) =>
              pipe(
                spawn(delegateWorker<Relic>(delegateScopeRef, failure)),
                wisp.liftF,
                wisp.chain(({ scopeRef }) => awaitScopeInBand(scopeRef)),
              ),
          ),
        ),
      wispEither.right,
    ),
  );
}

function delegateWorker<Relic>(
  delegateScopeRef: ScopeRef<unknown>,
  failure: Failure,
): Ritual<Either<Failure, Relic>> {
  return () =>
    pipe(
      send(delegateScopeRef, resumableFailureMessageKey, failure),
      wisp.liftF,
      wisp.chainF(() => receive(resumableRecoveryMessageKey)),
      wisp.map(({ value }) => value),
      wisp.map(narrowAs<Either<Failure, Relic>>()),
    );
}
