import type { FutureKey, FutureResult, Wisp } from "#/contracts";
import type { Option } from "#/utils";
import { poll as pollSigil } from "#/sigils";
import { wisp } from "#/internal/fp";

export function poll<Result>(future: FutureKey<Result>): Wisp<Option<FutureResult<Result>>> {
  return wisp.liftF(pollSigil(future));
}
