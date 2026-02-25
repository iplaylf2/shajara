export class RuntimeScopeTerminatedError extends Error {
  constructor() {
    super("Runtime scope terminated");
    this.name = "RuntimeScopeTerminatedError";
  }
}
