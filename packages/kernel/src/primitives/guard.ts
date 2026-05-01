import type { FailureShape, FutureKey, Ritual, Wisp } from "#/contracts";
import type { ChannelReceiver } from "./channel";
import type { Either } from "#/utils/index";
import type { ReceiveResult } from "./receive";
import type { RecoveryRequest } from "#/primitives-kit";
import type { ScopeFailure } from "#/failures";
import { bind } from "./bind";
import { branch } from "./branch";
import { channel } from "./channel";
import { narrowAs } from "#/utils/index";
import { pipe } from "fp-ts/function";
import { receive } from "./receive";
import { recoveryChannelKey } from "#/primitives-kit";
import { settle } from "./settle";
import { spawn } from "./spawn";
import { wisp } from "#/internal/fp";

export function guard(entry: Ritual<void>, recover: RecoveryHandler): Wisp<FutureKey<void>> {
  return pipe(
    branch(withRecoveryPoint(entry, recover)),
    wisp.map(({ scope }) => scope.exitFuture),
  );
}

export type RecoveryHandler = (failure: ScopeFailure) => Wisp<Either<FailureShape, unknown>>;

function withRecoveryPoint(entry: Ritual<void>, recover: RecoveryHandler) {
  return () =>
    pipe(
      channel<RecoveryRequest, unknown>(Infinity),
      wisp.chainFirst(([, sender]) => bind(recoveryChannelKey, sender)),
      wisp.chain(([receiver]) =>
        spawn(recoveryLoop(recover, receiver), { completionMode: "detached" }),
      ),
      wisp.chain(entry),
    );
}

function recoveryLoop(
  recover: RecoveryHandler,
  receiver: ChannelReceiver<RecoveryRequest, unknown>,
) {
  return function loop(): Wisp<never> {
    return pipe(
      receiveInBand(receiver),
      wisp.chain((value) => spawn(recoveryAttempt(value, recover))),
      wisp.chain(loop),
    );
  };
}

function receiveInBand<Value, Outcome>(receiver: ChannelReceiver<Value, Outcome>): Wisp<Value> {
  return pipe(
    receive(receiver),
    wisp.map(narrowAs<Extract<ReceiveResult<Value, Outcome>, { kind: "value" }>>()),
    wisp.map(({ value }) => value),
  );
}

function recoveryAttempt(request: RecoveryRequest, recover: RecoveryHandler) {
  return () =>
    pipe(
      recover(request.failure),
      wisp.chain((recovery) => settle(request.recoverySettle, recovery)),
    );
}
