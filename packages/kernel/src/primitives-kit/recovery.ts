import type { ChannelReceiver, ChannelSender, ReceiveResult } from "#/sigils/index";
import type { Failure, ScopeFailure } from "#/failures";
import type { FutureResult, FutureSettleKey, Ritual, Wisp } from "#/contracts";
import {
  bind,
  channel,
  future,
  halt,
  lookup,
  receive,
  send,
  settle,
  spawn,
  wait,
} from "#/sigils/index";
import { wisp, wispOption } from "#/internal/fp";
import type { Option } from "fp-ts/Option";
import { contextKey } from "#/contracts";
import { either } from "fp-ts";
import { interruptedFailure } from "#/failures";
import { narrowAs } from "#/utils/index";
import { pipe } from "fp-ts/function";

export function withRecoveryAnchor<Relic>(entry: Ritual<Relic>): Ritual<Relic> {
  return () =>
    pipe(
      wisp.Do,
      wisp.bindF("requests", () => channel<RecoveryRequest, unknown>(Infinity)),
      wisp.chainFirstF(({ requests: [, route] }) => bind(recoveryRouteKey, route)),
      wisp.chainFirstF(({ requests: [receiver] }) =>
        spawn(
          serveRecovery(receiver, (request) =>
            wisp.liftF(settle(request.replyTo, either.right(request.failure))),
          ),
          {
            completionMode: "detached",
          },
        ),
      ),
      wisp.chain(entry),
    );
}

export function withRecoveryPoint<Relic>(
  entry: Ritual<Relic>,
  handle: RecoveryHandler,
): Ritual<Relic> {
  return () =>
    pipe(
      wisp.Do,
      wisp.bind("ancestor", () =>
        pipe(
          wisp.liftF(lookup(recoveryRouteKey)),
          wispOption.getOrElse<ChannelSender<RecoveryRequest, unknown>>(() =>
            wisp.liftF(halt(missingRecoveryAnchor("recovery-point"))),
          ),
        ),
      ),
      wisp.bindF("requests", () => channel<RecoveryRequest, unknown>(Infinity)),
      wisp.chainFirstF(({ requests: [, route] }) => bind(recoveryRouteKey, route)),
      wisp.chainFirstF(({ ancestor, requests: [receiver] }) =>
        spawn(
          serveRecovery(receiver, (request) =>
            pipe(
              handle(request.failure),
              wispOption.matchE<unknown, either.Either<Failure, unknown>>(
                () => wisp.liftF(send(ancestor, request)),
                (recovery) => wisp.liftF(settle(request.replyTo, recovery)),
              ),
            ),
          ),
          {
            completionMode: "detached",
          },
        ),
      ),
      wisp.chain(entry),
    );
}

export function requestRecovery<Relic>(failure: ScopeFailure): Wisp<FutureResult<Relic>> {
  return pipe(
    wisp.Do,
    wisp.bind("route", () =>
      pipe(
        wisp.liftF(lookup(recoveryRouteKey)),
        wispOption.getOrElse<ChannelSender<RecoveryRequest, unknown>>(() =>
          wisp.liftF(halt(missingRecoveryAnchor("recovery-request"))),
        ),
      ),
    ),
    wisp.bindF("reply", () => future<Relic>()),
    wisp.chainFirstF(({ reply: [, replyTo], route }) =>
      send(route, {
        failure,
        replyTo,
      }),
    ),
    wisp.chainF(({ reply: [replyFuture] }) => wait(replyFuture)),
  );
}

export type RecoveryHandler = (
  failure: ScopeFailure,
) => Wisp<Option<either.Either<Failure, unknown>>>;

function serveRecovery(
  receiver: ChannelReceiver<RecoveryRequest, unknown>,
  handle: (request: RecoveryRequest) => Wisp<unknown>,
) {
  return function loop(): Wisp<never> {
    return pipe(
      wisp.Do,
      wisp.chainF(() => receive(receiver)),
      wisp.map(narrowAs<Extract<ReceiveResult<RecoveryRequest, unknown>, { kind: "value" }>>()),
      wisp.map(({ value }) => value),
      wisp.chainF((request) => spawn(() => handle(request))),
      wisp.chain(loop),
    );
  };
}

function missingRecoveryAnchor(site: MissingRecoveryAnchorSite): Failure {
  return interruptedFailure({
    reason: "missing-recovery-anchor",
    site,
  });
}

const recoveryRouteKey = contextKey<ChannelSender<RecoveryRequest, unknown>>();

interface RecoveryRequest {
  readonly failure: ScopeFailure;
  readonly replyTo: FutureSettleKey<unknown>;
}

type MissingRecoveryAnchorSite = "recovery-point" | "recovery-request";
