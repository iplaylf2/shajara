import type { RuntimePrimitive } from "#src/runtime-kit/runtime-protocol";

export type RuntimePrimitiveTuple<ReturnValues extends readonly unknown[]> = {
  [Index in keyof ReturnValues]: RuntimePrimitive<ReturnValues[Index]>;
};
