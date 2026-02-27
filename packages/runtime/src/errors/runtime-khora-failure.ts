import type { KhoraFailure } from "@khora/kernel";

export class RuntimeKhoraError extends Error {
  readonly failure: KhoraFailure;

  constructor(failure: KhoraFailure) {
    super(failure.message());
    this.name = "RuntimeKhoraError";
    this.failure = failure;
  }
}

export function runtimeErrorAsKhoraFailure(error: Error): KhoraFailure {
  return {
    kind: "runtime-error",
    message: () => error.message,
  };
}

export function khoraFailureFromRuntimeUnknown(caught: unknown): KhoraFailure {
  if (caught instanceof RuntimeKhoraError) {
    return caught.failure;
  }
  if (caught instanceof Error) {
    return runtimeErrorAsKhoraFailure(caught);
  }
  return {
    kind: "runtime-error",
    message: () => String(caught),
  };
}
