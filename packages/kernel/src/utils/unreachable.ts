/** Marks a control-flow path that should be unreachable. */
export function unreachable(): never {
  throw new Error("Unreachable code path");
}
