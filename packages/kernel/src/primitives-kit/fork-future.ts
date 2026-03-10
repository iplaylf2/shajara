import type {
  Failure,
  FutureKey,
  FutureResolverKey,
  ProcessRef,
  Ritual,
  Wisp,
} from "#src/contracts";
import { awaitFuture, fork, future, settleFuture } from "#src/sigils";
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
    wisp.chainFirst(([, chainedResolverKey]) =>
      forkFutureInto(futureKey, chainedResolverKey, chain),
    ),
    wisp.map(([chainedFutureKey]) => chainedFutureKey),
  );
}

// oxlint-disable-next-line id-length
export function forkFutureInto<
  Source extends either.Either<Failure, unknown>,
  Chained extends either.Either<Failure, unknown>,
>(
  futureKey: FutureKey<Source>,
  chainedResolverKey: FutureResolverKey<Chained>,
  chain: (value: Source) => Wisp<Chained>,
): Wisp<ProcessRef<void>> {
  return pipe(fork(chainFuture(futureKey, chainedResolverKey, chain)), wisp.liftF);
}

// oxlint-disable-next-line id-length
function chainFuture<
  Source extends either.Either<Failure, unknown>,
  Chained extends either.Either<Failure, unknown>,
>(
  futureKey: FutureKey<Source>,
  chainedResolverKey: FutureResolverKey<Chained>,
  chain: (value: Source) => Wisp<Chained>,
): Ritual<void> {
  return () =>
    pipe(
      awaitFuture(futureKey),
      wisp.liftF,
      wisp.chain(chain),
      wisp.chainF((result) => settleFuture(chainedResolverKey, result)),
    );
}
