export class RuntimeScopeFailedError extends Error {
  readonly reason: unknown;

  constructor(reason: unknown) {
    super("Runtime scope failed");
    this.name = "RuntimeScopeFailedError";
    this.reason = reason;
  }
}
