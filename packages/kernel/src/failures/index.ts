import type { CanceledFailure } from "./canceled";
import type { ChannelFailure } from "./channel";
import type { ExternalFailure } from "./external";
import type { InterruptedFailure } from "./interrupted";
import type { ScopeFailure } from "./scope";
import type { UnfulfilledFailure } from "./unfulfilled";

export * from "./canceled";
export * from "./channel";
export * from "./external";
export * from "./interrupted";
export * from "./scope";
export * from "./unfulfilled";

/** Failure variants that can appear in future results. */
export type Failure =
  | CanceledFailure
  | ChannelFailure
  | ExternalFailure
  | InterruptedFailure
  | ScopeFailure
  | UnfulfilledFailure;

/** Failure variants exposed on the left side of a scope exit future. */
export type ScopeExitFailure = CanceledFailure | ScopeFailure;
