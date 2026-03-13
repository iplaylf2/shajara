import type { ExternalFailure } from "./external";
import type { ScopeHaltedFailure } from "./scope-halted";
import type { ScopeTerminatedFailure } from "./scope-terminated";

export * from "./external";
export * from "./scope-halted";
export * from "./scope-terminated";

export type Failure = ExternalFailure | ScopeHaltedFailure | ScopeTerminatedFailure;
