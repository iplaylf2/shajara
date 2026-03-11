import type { FutureKey, FutureResult, Wisp } from "#src/contracts";
import type { Option } from "#src/utils";
import { poll as pollSigil } from "#src/sigils";
import { wisp } from "#src/internal/fp";

export function poll<Result>(future: FutureKey<Result>): Wisp<Option<FutureResult<Result>>> {
  return wisp.liftF(pollSigil(future));
}
