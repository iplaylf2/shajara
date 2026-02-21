import type { Plan } from "#src/plan";
import { notImplemented } from "#src/internal/not-implemented";

export function all<ReturnValues extends readonly unknown[]>(_primitives: {
  readonly [Index in keyof ReturnValues]: Plan<ReturnValues[Index]>;
}): Plan<ReturnValues> {
  return notImplemented("kernel primitive 'all'");
}
