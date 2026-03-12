import type { Failure, FutureKey, Ritual, Wisp } from "#src/contracts";
import { bind, fork, receive, self, settle, spawn, wait } from "#src/sigils";
import { resolvePrimary, resumableDelegateKey, resumableFailureKey } from "#src/primitives-kit";
import type { Either } from "#src/utils";
import type { ResumableRecoveryRequest } from "#src/primitives-kit";
import { either } from "fp-ts";
import { pipe } from "fp-ts/function";
import { wisp } from "#src/internal/fp";

export function guard<Relic>(
  entry: Ritual<Relic>,
  recover: RecoveryHandler,
): Wisp<FutureKey<Relic>> {
  return pipe(
    spawn(withRecoveryPoint(entry, recover)),
    wisp.liftF,
    wisp.map(({ processRef }) => processRef.exitFuture),
  );
}

export type RecoveryHandler = (failure: Failure) => Wisp<Either<Failure, unknown>>;

function withRecoveryPoint<Relic>(entry: Ritual<Relic>, recover: RecoveryHandler): Ritual<Relic> {
  return () =>
    pipe(
      self(),
      wisp.liftF,
      wisp.chainF(({ scopeRef }) => bind(resumableDelegateKey, scopeRef)),
      wisp.chainF(() => fork(recoveryWorker(recover), { participation: "auxiliary" })),
      wisp.chain(entry),
    );
}

function recoveryWorker(recover: RecoveryHandler): Ritual<never> {
  return function loop(): Wisp<never> {
    return pipe(
      receive(resumableFailureKey),
      wisp.liftF,
      wisp.chainF((value) => fork(recoveryAttempt(value, recover))),
      wisp.chain(loop),
    );
  };
}

function recoveryAttempt(
  request: ResumableRecoveryRequest<unknown>,
  recover: RecoveryHandler,
): Ritual<void> {
  return () =>
    pipe(
      resolvePrimary(() => recover(request.failure)),
      wisp.chainF(wait),
      wisp.map(either.flatten),
      wisp.chainF((recovery) => settle(request.recoverySettle, recovery)),
    );
}
