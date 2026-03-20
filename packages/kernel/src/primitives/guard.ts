import type { FailureShape, FutureKey, Ritual, Wisp } from "#src/contracts";
import { bind, branch, receive, self, settle, spawn } from "#src/sigils";
import { resumableDelegateKey, resumableFailureKey } from "#src/primitives-kit";
import type { Either } from "#src/utils";
import type { ResumableRecoveryRequest } from "#src/primitives-kit";
import { pipe } from "fp-ts/function";
import { wisp } from "#src/internal/fp";

export function guard(entry: Ritual<void>, recover: RecoveryHandler): Wisp<FutureKey<void>> {
  return pipe(
    branch(withRecoveryPoint(entry, recover)),
    wisp.liftF,
    wisp.map(({ scope }) => scope.exitFuture),
  );
}

export type RecoveryHandler = (failure: FailureShape) => Wisp<Either<FailureShape, unknown>>;

function withRecoveryPoint(entry: Ritual<void>, recover: RecoveryHandler) {
  return () =>
    pipe(
      self(),
      wisp.liftF,
      wisp.chainF(({ scope }) => bind(resumableDelegateKey, scope)),
      wisp.chainF(() => spawn(recoveryWorker(recover), { completionMode: "detached" })),
      wisp.chain(entry),
    );
}

function recoveryWorker(recover: RecoveryHandler) {
  return function loop(): Wisp<never> {
    return pipe(
      receive(resumableFailureKey),
      wisp.liftF,
      wisp.chainF((value) => spawn(recoveryAttempt(value, recover))),
      wisp.chain(loop),
    );
  };
}

function recoveryAttempt(request: ResumableRecoveryRequest<unknown>, recover: RecoveryHandler) {
  return () =>
    pipe(
      recover(request.failure),
      wisp.chainF((recovery) => settle(request.recoverySettle, recovery)),
    );
}
