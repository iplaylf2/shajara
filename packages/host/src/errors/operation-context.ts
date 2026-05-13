/** Error thrown when an operation is used outside an active shajara routine. */
export class OperationContextError extends Error {
  public constructor() {
    super("Host operation requires an executor context.");
  }

  public override readonly name = "OperationContextError";
}
