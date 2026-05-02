import type { UnknownRecord } from "type-fest";

export type CompletionMode = "structural" | "detached";

export type ScopeDescriptor = Readonly<UnknownRecord>;

export interface ProcessDescriptor extends Readonly<UnknownRecord> {
  readonly completionMode: CompletionMode;
}
