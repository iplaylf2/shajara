import type { CanceledError } from "./canceled.js";
import type { ScopeError } from "./scope.js";

/** Error variants that represent cancellation or failure of a child scope. */
export type ScopeExitError = CanceledError | ScopeError;
