import type { Failure, FutureKey } from "./kernel";
import type { FutureSettleKey } from "@shajara/kernel";
import type { Sigil } from "@shajara/kernel/sigils";

export type RiteRoutine<Return> = () => RiteCoroutine<Return>;

export type RiteCoroutine<Return> = Generator<Sigil, Return, unknown>;

export type RiteFuture<Result> = FutureKey<Result>;
export type RiteFutureSettle<Result> = FutureSettleKey<Result>;

export abstract class ShajaraError extends Error {
  constructor(protected readonly failure: Failure) {
    super(failure.message());
  }

  toFailure(): Failure {
    return this.failure;
  }

  abstract override readonly name: string;
}
