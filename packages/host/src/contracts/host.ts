import type { Failure, FutureKey } from "./kernel";
import type { Either } from "@shajara/kernel/utils";
import type { Sigil } from "@shajara/kernel";

export type RiteRoutine<Return> = () => RiteCoroutine<Return>;

export type RiteCoroutine<Return> = Generator<Sigil, Return, unknown>;

export type RiteFuture<Return> = FutureKey<Either<Failure, Return>>;

export abstract class ShajaraError extends Error {
  constructor(protected readonly failure: Failure) {
    super(failure.message());
  }

  toFailure(): Failure {
    return this.failure;
  }

  abstract override readonly name: string;
}
