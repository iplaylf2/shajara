import type { IsEqual, UnknownArray } from "type-fest";

export function narrowAs<Narrow>() {
  return <Wide>(value: Wide) => value as Narrow extends Wide ? Narrow : unknown;
}

export function narrowArrayAs<Narrow>() {
  return <Wide extends UnknownArray>(value: Wide) =>
    value as IsEqual<Wide, UnknownArray> extends true
      ? Narrow
      : Narrow extends Wide
        ? Narrow
        : unknown;
}
