import type {
  FutureKey,
  FutureResult,
  FutureSettleKey,
  ProcessRef,
  Ritual,
  Wisp,
} from "#src/contracts";
import { fork, future, settle, wait } from "#src/sigils";
import { pipe } from "fp-ts/function";
import { wisp } from "#src/internal/fp";

// oxlint-disable-next-line id-length
export function forkFuture<Source, Chained>(
  sourceFuture: FutureKey<Source>,
  chain: (value: FutureResult<Source>) => Wisp<FutureResult<Chained>>,
): Wisp<FutureKey<Chained>> {
  return pipe(
    future<Chained>(),
    wisp.liftF,
    wisp.chainFirst(([, chainedSettle]) => forkFutureInto(sourceFuture, chainedSettle, chain)),
    wisp.map(([chainedFuture]) => chainedFuture),
  );
}

// oxlint-disable-next-line id-length
export function forkFutureInto<Source, Chained>(
  sourceFuture: FutureKey<Source>,
  chainedSettle: FutureSettleKey<Chained>,
  chain: (value: FutureResult<Source>) => Wisp<FutureResult<Chained>>,
): Wisp<ProcessRef<void>> {
  return pipe(fork(chainFuture(sourceFuture, chainedSettle, chain)), wisp.liftF);
}

// oxlint-disable-next-line id-length
function chainFuture<Source, Chained>(
  sourceFuture: FutureKey<Source>,
  chainedSettle: FutureSettleKey<Chained>,
  chain: (value: FutureResult<Source>) => Wisp<FutureResult<Chained>>,
): Ritual<void> {
  return () =>
    pipe(
      wait(sourceFuture),
      wisp.liftF,
      wisp.chain(chain),
      wisp.chainF((result) => settle(chainedSettle, result)),
    );
}
