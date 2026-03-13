import type { FutureKey, Ritual, Wisp } from "#src/contracts";
import { pipe } from "fp-ts/function";
import { spawn as spawnSigil } from "#src/sigils";
import { wisp } from "#src/internal/fp";

export function spawn<Relic>(entry: Ritual<Relic>): Wisp<FutureKey<Relic>> {
  return pipe(
    spawnSigil(entry),
    wisp.liftF,
    wisp.map((processRef) => processRef.exitFuture),
  );
}
