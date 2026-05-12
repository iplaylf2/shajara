import type { IsEqual, UnknownArray } from "type-fest";

/**
 * Type-level narrowing helper.
 *
 * @returns Narrowing function.
 */
// oxlint-disable-next-line explicit-module-boundary-types
export function narrowAs<Narrow>() {
  return <Wide>(value: Wide) => value as Narrow extends Wide ? Narrow : unknown;
}

/**
 * Tuple-aware narrowing helper.
 *
 * @returns Array narrowing function.
 */
// oxlint-disable-next-line explicit-module-boundary-types
export function narrowArrayAs<Narrow>() {
  return <Wide extends UnknownArray>(value: Wide) =>
    value as IsEqual<Wide, UnknownArray> extends true
      ? Narrow
      : Narrow extends Wide
        ? Narrow
        : unknown;
}
