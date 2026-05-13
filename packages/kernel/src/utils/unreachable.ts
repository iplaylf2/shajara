/** Throws when a control-flow path believed to be unreachable is reached. */
export function unreachable(): never {
  throw new Error("Unreachable code path");
}
