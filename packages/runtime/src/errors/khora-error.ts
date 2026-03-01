import type { Failure } from "@khora/kernel";

export function failureFromUnknown(caught: unknown): Failure {
  if (caught instanceof KhoraError) {
    return caught.failure;
  }
  if (caught instanceof Error) {
    return failureFromError(caught);
  }
  return {
    kind: "runtime-error",
    message: () => String(caught),
  };
}

export class KhoraError extends Error {
  readonly failure: Failure;

  constructor(failure: Failure) {
    super(failure.message());
    this.name = "KhoraError";
    this.failure = failure;
  }
}

export function failureFromError(error: Error): Failure {
  return {
    kind: "runtime-error",
    message: () => error.message,
  };
}
