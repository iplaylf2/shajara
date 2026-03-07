import type { Ritual, ScopeRef, ScopeSpec, Wisp } from "#src/contracts";
import { pipe } from "fp-ts/function";
import { spawn } from "#src/sigils";
import { wisp } from "#src/internal/fp";

export function spawnScope<Relic>(entry: Ritual<Relic>, spec: ScopeSpec): Wisp<ScopeRef<Relic>> {
  return pipe(
    spawn(entry, spec),
    wisp.liftF,
    wisp.map(({ scopeRef }) => scopeRef),
  );
}
