import type { FutureKey, Ritual, Wisp } from "#/contracts";
import type { ProcessDescriptor } from "#/sigils/index";
import { pipe } from "fp-ts/function";
import { spawn as spawnSigil } from "#/sigils/index";
import { wisp } from "#/internal/fp";

export function spawn<Relic>(
  entry: Ritual<Relic>,
  descriptor?: ProcessDescriptor,
): Wisp<FutureKey<Relic>> {
  return pipe(
    spawnSigil(entry, descriptor),
    wisp.liftF,
    wisp.map((process) => process.exitFuture),
  );
}
