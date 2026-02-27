import { RuntimeKhoraError } from "./runtime-khora-failure";

export class RuntimeScopeTerminatedError extends RuntimeKhoraError {
  constructor() {
    super({
      kind: "scope-terminated",
      message: () => "Runtime scope terminated",
    });
    this.name = "RuntimeScopeTerminatedError";
  }
}
