import type { FutureKey, FutureResult, Wisp } from "#/contracts";
import type { Option } from "#/utils/index";
import { poll as pollSigil } from "#/sigils/index";
import { wisp } from "#/internal/fp";

export function poll<Result>(future: FutureKey<Result>): Wisp<Option<FutureResult<Result>>> {
  return wisp.liftF(pollSigil(future));
}
