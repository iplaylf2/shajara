import type { Failure, FutureKey } from "./kernel";
import type { FutureResolverKey, Sigil } from "@shajara/kernel";
import type { Either } from "@shajara/kernel/utils";

export type RiteRoutine<Return> = () => RiteCoroutine<Return>;

export type RiteCoroutine<Return> = Generator<Sigil, Return, unknown>;

export type RiteFuture<Return> = FutureKey<Either<Failure, Return>>;
export type RiteFutureResolver<Return> = FutureResolverKey<Either<Failure, Return>>;

export abstract class ShajaraError extends Error {
  constructor(protected readonly failure: Failure) {
    super(failure.message());
  }

  toFailure(): Failure {
    return this.failure;
  }

  abstract override readonly name: string;
}
