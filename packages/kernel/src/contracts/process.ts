import type { KhoraFailure } from "./failure";
const PROCESS_REF_TOKEN: unique symbol = Symbol("process-ref");

export interface ProcessRef<Return> {
  readonly [PROCESS_REF_TOKEN]: "process-ref";
  readonly _return?: Return;
}

export type ProcessExit<Return> =
  | { readonly kind: "completed"; readonly value: Return }
  | { readonly kind: "failed"; readonly fault: KhoraFailure }
  | { readonly kind: "terminated" };
