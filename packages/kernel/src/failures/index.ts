import type { CanceledFailure } from "./canceled";
import type { ChannelFailure } from "./channel";
import type { ExternalFailure } from "./external";
import type { InterruptedFailure } from "./interrupted";
import type { ScopeFailure } from "./scope";

export * from "./canceled";
export * from "./channel";
export * from "./external";
export * from "./interrupted";
export * from "./scope";

/** Failure variants that can appear in kernel future results. */
export type Failure =
  | CanceledFailure
  | ChannelFailure
  | ExternalFailure
  | InterruptedFailure
  | ScopeFailure;

/** Failure variants exposed on the left side of a scope exit future. */
export type ScopeExitFailure = CanceledFailure | ScopeFailure;
