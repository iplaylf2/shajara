import type { IsEqual, UnknownArray } from "type-fest";

/**
 * Provides an unchecked value cast constrained by assignability.
 *
 * @returns Function that narrows a value when the requested type is assignable.
 */
// oxlint-disable-next-line explicit-module-boundary-types
export function narrowAs<Narrow>() {
  return <Wide>(value: Wide) => value as Narrow extends Wide ? Narrow : unknown;
}

/**
 * Provides an unchecked tuple cast constrained by assignability.
 *
 * @returns Function that narrows tuple-like arrays while rejecting unconstrained arrays.
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
