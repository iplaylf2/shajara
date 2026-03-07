import type { Option } from "@shajara/kernel/utils";
import { isNone } from "@shajara/kernel/utils";

export function unwrapOption<Return>(option: Option<Return>, noneError: Error): Return {
  if (isNone(option)) {
    throw noneError;
  }

  return option.value;
}
