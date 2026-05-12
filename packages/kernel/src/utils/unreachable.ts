/**
 * Marks impossible control flow.
 *
 * @returns No value.
 */
export function unreachable(): never {
  throw new Error("Unreachable code path");
}
