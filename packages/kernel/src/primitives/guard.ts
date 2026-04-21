import type { FailureShape, FutureKey, Ritual, Wisp } from "#/contracts";
import { bind, branch, channel, settle, spawn } from "#/sigils/index";
import { receiveInBand, recoveryChannelKey } from "#/primitives-kit";
import type { ChannelReceiver } from "#/sigils/index";
import type { Either } from "#/utils/index";
import type { RecoveryRequest } from "#/primitives-kit";
import type { ScopeFailure } from "#/failures";
import { pipe } from "fp-ts/function";
import { wisp } from "#/internal/fp";

export function guard(entry: Ritual<void>, recover: RecoveryHandler): Wisp<FutureKey<void>> {
  return pipe(
    branch(withRecoveryPoint(entry, recover)),
    wisp.liftF,
    wisp.map(({ scope }) => scope.exitFuture),
  );
}

export type RecoveryHandler = (failure: ScopeFailure) => Wisp<Either<FailureShape, unknown>>;

function withRecoveryPoint(entry: Ritual<void>, recover: RecoveryHandler) {
  return () =>
    pipe(
      channel<RecoveryRequest>(Infinity),
      wisp.liftF,
      wisp.chainFirstF(([, sender]) => bind(recoveryChannelKey, sender)),
      wisp.chainF(([receiver]) =>
        spawn(recoveryWorker(recover, receiver), { completionMode: "detached" }),
      ),
      wisp.chain(entry),
    );
}

function recoveryWorker(recover: RecoveryHandler, receiver: ChannelReceiver<RecoveryRequest>) {
  return function loop(): Wisp<never> {
    return pipe(
      receiveInBand(receiver),
      wisp.chainF((value) => spawn(recoveryAttempt(value, recover))),
      wisp.chain(loop),
    );
  };
}

function recoveryAttempt(request: RecoveryRequest, recover: RecoveryHandler) {
  return () =>
    pipe(
      recover(request.failure),
      wisp.chainF((recovery) => settle(request.recoverySettle, recovery)),
    );
}
