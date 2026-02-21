const PROCESS_REF_TOKEN: unique symbol = Symbol("process-ref");

export interface ProcessRef<ReturnValue = unknown> {
  readonly [PROCESS_REF_TOKEN]: "process-ref";
  readonly _return?: ReturnValue;
}

export type ProcessExit<ReturnValue = unknown> =
  | { readonly kind: "completed"; readonly value: ReturnValue }
  | { readonly kind: "failed"; readonly fault: unknown }
  | { readonly kind: "terminated" };
