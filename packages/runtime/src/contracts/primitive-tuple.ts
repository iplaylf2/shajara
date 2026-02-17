import type { RuntimePrimitive } from "./plan";

export type RuntimePrimitiveTuple<ReturnValues extends readonly unknown[]> = {
  [Index in keyof ReturnValues]: RuntimePrimitive<ReturnValues[Index]>;
};
