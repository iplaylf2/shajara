import type { CanceledError } from "./canceled";
import type { ScopeError } from "./scope";

/** Error variants that represent cancellation or failure of a child scope. */
export type ScopeExitError = CanceledError | ScopeError;
