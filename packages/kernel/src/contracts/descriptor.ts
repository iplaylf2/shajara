import type { UnknownRecord } from "type-fest";

/** Controls whether a process participates in its scope's completion condition. */
export type CompletionMode = "structural" | "detached";

/** Read-only metadata attached to a scope when it is created. */
export type ScopeDescriptor = Readonly<UnknownRecord>;

/** Read-only metadata attached to a process when it is created. */
export interface ProcessDescriptor extends Readonly<UnknownRecord> {
  /** Completion behavior for the process within its enclosing scope. */
  readonly completionMode: CompletionMode;
}
