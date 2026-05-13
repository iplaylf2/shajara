import type { CanceledError } from "./canceled";
import type { ScopeError } from "./scope";

/** Error variants that represent child-scope exit failure. */
export type ScopeExitError = CanceledError | ScopeError;
