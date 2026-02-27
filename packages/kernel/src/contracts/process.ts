import type { KhoraFailure } from "./failure";
import { REF_TOKEN } from "#src/utils/ref";

export interface ProcessRef<Return> {
  readonly [REF_TOKEN]: "process";
  readonly return?: readonly [Return];
}

export type ProcessRefReturn<Ref extends ProcessRef<unknown>> =
  Ref extends ProcessRef<infer Return> ? Return : never;

export type ProcessExit<Return> =
  | { readonly kind: "completed"; readonly value: Return }
  | { readonly kind: "failed"; readonly fault: KhoraFailure }
  | { readonly kind: "terminated" };
