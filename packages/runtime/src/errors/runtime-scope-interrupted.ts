export class RuntimeScopeInterruptedError extends Error {
  constructor() {
    super("Runtime scope interrupted");
    this.name = "RuntimeScopeInterruptedError";
  }
}
