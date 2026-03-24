import type { Option } from "@shajara/kernel/utils";
import type { Optional } from "type-fest";
import { isNone } from "@shajara/kernel/utils";

export function unwrapOption<Return>(option: Option<Return>): Optional<Return> {
  if (isNone(option)) {
    return;
  }

  return option.value as Optional<Return>;
}
