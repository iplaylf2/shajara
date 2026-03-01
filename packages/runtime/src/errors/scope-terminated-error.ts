import { KhoraError } from "./khora-error";

export class ScopeTerminatedError extends KhoraError {
  constructor() {
    super({
      kind: "scope-terminated",
      message: () => "Runtime scope terminated",
    });
    this.name = "ScopeTerminatedError";
  }
}
