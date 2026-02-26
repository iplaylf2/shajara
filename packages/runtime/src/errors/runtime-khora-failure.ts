import type { KhoraFailure } from "@khora/kernel";

export class RuntimeKhoraFailureError extends Error {
  readonly failure: KhoraFailure;

  constructor(failure: KhoraFailure) {
    super(failure.message());
    this.name = "RuntimeKhoraFailureError";
    this.failure = failure;
  }
}
