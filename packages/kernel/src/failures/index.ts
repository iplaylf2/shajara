import type { CanceledFailure } from "./canceled";
import type { ExternalFailure } from "./external";
import type { ScopeFailure } from "./scope-failed";

export * from "./canceled";
export * from "./external";
export * from "./scope-failed";

export type Failure = CanceledFailure | ExternalFailure | ScopeFailure;
