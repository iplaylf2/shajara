import type { Failure, FutureKey, FutureResolverKey, Ritual, Wisp } from "#src/contracts";
import { awaitFuture, fork, future, settleFuture } from "#src/sigils";
import { wisp, wispEither } from "#src/internal/fp";
import { either } from "fp-ts";
import { pipe } from "fp-ts/function";

// oxlint-disable-next-line id-length
export function chainFuture<F extends Failure, Source, Chained>(
  futureKey: FutureKey<either.Either<F, Source>>,
  chain: (value: Source) => Wisp<either.Either<F, Chained>>,
): Wisp<FutureKey<either.Either<F, Chained>>> {
  return pipe(
    future<either.Either<F, Chained>>(),
    wisp.liftF,
    wisp.chainFirstF(([, chainedResolverKey]) =>
      fork(chainFutureRelay(futureKey, chainedResolverKey, chain)),
    ),
    wisp.map(([chainedFutureKey]) => chainedFutureKey),
  );
}

// oxlint-disable-next-line id-length
function chainFutureRelay<F extends Failure, Source, Chained>(
  futureKey: FutureKey<either.Either<F, Source>>,
  chainedResolverKey: FutureResolverKey<either.Either<F, Chained>>,
  chain: (value: Source) => Wisp<either.Either<F, Chained>>,
): Ritual<void> {
  return () =>
    pipe(
      awaitFuture(futureKey),
      wisp.liftF,
      wispEither.chain(chain),
      wisp.chainF((result) => settleFuture(chainedResolverKey, result)),
    );
}
