import type { Failure } from "./kernel";
import type { Sigil } from "@shajara/kernel";

export type RiteRoutine<Return> = () => RiteCoroutine<Return>;

export type RiteCoroutine<Return> = Generator<Sigil, Return, unknown>;

export abstract class ShajaraError extends Error {
  constructor(protected readonly failure: Failure) {
    super(failure.message());
  }

  toFailure(): Failure {
    return this.failure;
  }

  abstract override readonly name: string;
}
