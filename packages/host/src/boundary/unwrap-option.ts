import type { Option } from "@shajara/kernel/utils";
import type { Presence } from "#/contracts";
import { isNone } from "@shajara/kernel/utils";

export function unwrapOption<Return>(option: Option<Return>): Presence<Return> {
  if (isNone(option)) {
    return [false];
  }

  return [true, option.value];
}
