export type CompletionMode = "structural" | "detached";

export interface ScopeDescriptor {
  readonly [key: string]: unknown;
  readonly [key: symbol]: unknown;
}

export interface ProcessDescriptor {
  readonly completionMode: CompletionMode;
  readonly [key: string]: unknown;
  readonly [key: symbol]: unknown;
}
