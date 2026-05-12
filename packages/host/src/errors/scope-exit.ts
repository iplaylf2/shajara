import type { CanceledError } from "./canceled";
import type { ScopeError } from "./scope";

export type ScopeExitError = CanceledError | ScopeError;
