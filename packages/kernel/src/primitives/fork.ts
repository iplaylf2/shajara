import type { FutureKey, Ritual, Wisp } from "#src/contracts";
import { fork as forkSigil } from "#src/sigils";
import { pipe } from "fp-ts/function";
import { wisp } from "#src/internal/fp";

export function fork<Relic>(entry: Ritual<Relic>): Wisp<FutureKey<Relic>> {
  return pipe(
    forkSigil(entry),
    wisp.liftF,
    wisp.map((processRef) => processRef.exitFuture),
  );
}
