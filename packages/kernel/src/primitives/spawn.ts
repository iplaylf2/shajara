import type { Ritual, ScopeRef, Wisp } from "#src/contracts";
import { pipe } from "fp-ts/function";
import { spawn as spawnSigil } from "#src/sigils";
import { wisp } from "#src/internal/fp";

export function spawn<Relic>(entry: Ritual<Relic>): Wisp<ScopeRef<Relic>> {
  return pipe(
    spawnSigil(entry),
    wisp.liftF,
    wisp.map(({ scopeRef }) => scopeRef),
  );
}
