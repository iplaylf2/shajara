import type { FutureKey } from "./future-key";
import type { REF_TOKEN } from "./token";

export interface ProcessRef<Value> {
  readonly [REF_TOKEN]: "process";
  readonly exitFuture: FutureKey<Value>;
}
