import type { Option } from "@shajara/kernel/utils";
import { isNone } from "@shajara/kernel/utils";

export function unwrapOption<Return>(option: Option<Return>): Return | undefined {
  if (isNone(option)) {
    return;
  }

  return option.value;
}
