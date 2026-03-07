import type { Ritual, ScopeRef, ScopeSpec, Wisp } from "#src/contracts";
import { pipe } from "fp-ts/function";
import { spawn } from "#src/sigils";
import { wisp } from "#src/internal/fp";

export function spawnScope<Return>(entry: Ritual<Return>, spec: ScopeSpec): Wisp<ScopeRef<Return>> {
  return pipe(
    spawn(entry, spec),
    wisp.liftF,
    wisp.map(({ scopeRef }) => scopeRef),
  );
}
