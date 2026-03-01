import type { Failure, Syscall } from "@khora/kernel";

export type RuntimeBlueprint<Return> = () => RuntimePlan<Return>;

export type RuntimePlan<Return> = Generator<Syscall, Return, unknown>;

export abstract class KhoraError extends Error {
  constructor(protected readonly failure: Failure) {
    super(failure.message());
    this.name = "KhoraError";
  }

  toFailure(): Failure {
    return this.failure;
  }
}
