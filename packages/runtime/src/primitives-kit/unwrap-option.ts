import type { Option } from "@khora/kernel/utils";
import { isNone } from "@khora/kernel/utils";

export function unwrapOption<Return>(option: Option<Return>, noneError: Error): Return {
  if (isNone(option)) {
    throw noneError;
  }

  return option.value;
}
