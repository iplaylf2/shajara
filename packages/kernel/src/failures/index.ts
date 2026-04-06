import type { CanceledFailure } from "./canceled";
import type { ExternalFailure } from "./external";
import type { InterruptedFailure } from "./interrupted";
import type { ScopeFailure } from "./scope";

export * from "./canceled";
export * from "./external";
export * from "./interrupted";
export * from "./scope";

export type Failure = CanceledFailure | ExternalFailure | InterruptedFailure | ScopeFailure;
