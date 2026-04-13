import type { FutureKey, Ritual, Wisp } from "#/contracts";
import { pipe } from "fp-ts/function";
import { spawn as spawnSigil } from "#/sigils";
import { wisp } from "#/internal/fp";

export function spawn<Relic>(entry: Ritual<Relic>): Wisp<FutureKey<Relic>> {
  return pipe(
    spawnSigil(entry),
    wisp.liftF,
    wisp.map((process) => process.exitFuture),
  );
}
