import type { FutureKey } from "./future-key.js";
import type { ProcessDescriptor } from "./descriptor.js";
import type { REF_TOKEN } from "./token.js";

/** Reference to one process and its exit future. */
export interface ProcessRef<Value, Descriptor extends ProcessDescriptor = ProcessDescriptor> {
  readonly [REF_TOKEN]: "process";
  readonly descriptor: Descriptor;
  readonly exitFuture: FutureKey<Value>;
}
