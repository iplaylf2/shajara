import type { AbortedFailure } from "./aborted";
import type { ExternalFailure } from "./external";
import type { ScopeFailure } from "./scope-failed";
import type { ScopeTerminatedFailure } from "./scope-terminated";

export * from "./aborted";
export * from "./external";
export * from "./scope-failed";
export * from "./scope-terminated";

export type Failure = AbortedFailure | ExternalFailure | ScopeFailure | ScopeTerminatedFailure;
