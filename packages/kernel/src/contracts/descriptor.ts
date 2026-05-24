import type { UnknownRecord } from "type-fest";

/** Process completion policy relative to its owning scope. */
export type CompletionMode = "structural" | "detached";

/** Read-only metadata carried by a scope reference. */
export type ScopeDescriptor = Readonly<UnknownRecord>;

/** Read-only metadata carried by a process reference. */
export interface ProcessDescriptor extends Readonly<UnknownRecord> {
  /**
   * `structural` processes keep the owning scope open; `detached` processes are
   * excluded from normal completion and canceled during scope convergence.
   */
  readonly completionMode: CompletionMode;
}
