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

export type Failure =
  | CanceledFailure
  | ChannelFailure
  | ExternalFailure
  | InterruptedFailure
  | ScopeFailure;

/** Failures that a scope exit future may expose. */
export type ScopeExitFailure = CanceledFailure | ScopeFailure;
