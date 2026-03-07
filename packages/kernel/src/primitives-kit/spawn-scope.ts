import type { Ritual, Wisp, ScopeRef, ScopeSpec } from "#src/contracts";
import { pipe } from "fp-ts/function";
import { wisp } from "#src/internal/fp";
import { spawn } from "#src/sigils";

export function spawnScope<Return>(
  entry: Ritual<Return>,
  spec: ScopeSpec,
): Wisp<ScopeRef<Return>> {
  return pipe(
    spawn(entry, spec),
    wisp.liftF,
    wisp.map(({ scopeRef }) => scopeRef),
  );
}
