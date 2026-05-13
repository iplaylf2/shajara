import type { UnknownRecord } from "type-fest";

/** Whether a process keeps its enclosing scope open while it runs. */
export type CompletionMode = "structural" | "detached";

/** Read-only metadata carried by a scope reference. */
export type ScopeDescriptor = Readonly<UnknownRecord>;

/** Read-only metadata carried by a process reference. */
export interface ProcessDescriptor extends Readonly<UnknownRecord> {
  /**
   * Structural processes keep the scope open; detached processes are canceled during
   * scope convergence.
   */
  readonly completionMode: CompletionMode;
}
