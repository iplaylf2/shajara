/** Error thrown when an operation requires an active shajara routine context. */
export class OperationContextError extends Error {
  public constructor() {
    super("Host operation requires an executor context.");
  }

  public override readonly name = "OperationContextError";
}
