import type { Option } from "@khora/kernel/utils";
import { matchOption } from "@khora/kernel/utils";

export function unwrapOption<Return>(option: Option<Return>, noneError: Error): Return {
  return matchOption(
    () => {
      throw noneError;
    },
    (value: Return) => value,
  )(option);
}
