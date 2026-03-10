import type { Failure, FutureKey, FutureSettleKey, ProcessRef, Ritual, Wisp } from "#src/contracts";
import { fork, future, settle, wait } from "#src/sigils";
import { either } from "fp-ts";
import { pipe } from "fp-ts/function";
import { wisp } from "#src/internal/fp";

// oxlint-disable-next-line id-length
export function forkFuture<
  Source extends either.Either<Failure, unknown>,
  Chained extends either.Either<Failure, unknown>,
>(futureKey: FutureKey<Source>, chain: (value: Source) => Wisp<Chained>): Wisp<FutureKey<Chained>> {
  return pipe(
    future<Chained>(),
    wisp.liftF,
    wisp.chainFirst(([, chainedSettleKey]) => forkFutureInto(futureKey, chainedSettleKey, chain)),
    wisp.map(([chainedFutureKey]) => chainedFutureKey),
  );
}

// oxlint-disable-next-line id-length
export function forkFutureInto<
  Source extends either.Either<Failure, unknown>,
  Chained extends either.Either<Failure, unknown>,
>(
  futureKey: FutureKey<Source>,
  chainedSettleKey: FutureSettleKey<Chained>,
  chain: (value: Source) => Wisp<Chained>,
): Wisp<ProcessRef<void>> {
  return pipe(fork(chainFuture(futureKey, chainedSettleKey, chain)), wisp.liftF);
}

// oxlint-disable-next-line id-length
function chainFuture<
  Source extends either.Either<Failure, unknown>,
  Chained extends either.Either<Failure, unknown>,
>(
  futureKey: FutureKey<Source>,
  chainedSettleKey: FutureSettleKey<Chained>,
  chain: (value: Source) => Wisp<Chained>,
): Ritual<void> {
  return () =>
    pipe(
      wait(futureKey),
      wisp.liftF,
      wisp.chain(chain),
      wisp.chainF((result) => settle(chainedSettleKey, result)),
    );
}
