import type { CanceledFailure } from "./canceled.js";
import type { ChannelFailure } from "./channel.js";
import type { ExternalFailure } from "./external.js";
import type { InterruptedFailure } from "./interrupted.js";
import type { ScopeFailure } from "./scope.js";
import type { UnfulfilledFailure } from "./unfulfilled.js";

export * from "./canceled.js";
export * from "./channel.js";
export * from "./external.js";
export * from "./interrupted.js";
export * from "./scope.js";
export * from "./unfulfilled.js";

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
