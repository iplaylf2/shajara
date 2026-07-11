import type { Option } from "@shajara/kernel/utils";
import type { Presence } from "#/contracts/index.js";
import { isNone } from "@shajara/kernel/utils";

/** Converts an `Option` into the `Presence` tuple form. */
export function unwrapOption<Return>(option: Option<Return>): Presence<Return> {
  if (isNone(option)) {
    return [false];
  }

  return [true, option.value];
}
