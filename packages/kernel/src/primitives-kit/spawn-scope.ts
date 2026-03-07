import type { Ritual, Wisp, ScopeRef, ScopeSpec } from "#src/contracts";
import { pipe } from "fp-ts/function";
import { plan } from "#src/internal/fp";
import { spawn } from "#src/syscalls";

export function spawnScope<Return>(
  entry: Ritual<Return>,
  spec: ScopeSpec,
): Wisp<ScopeRef<Return>> {
  return pipe(
    spawn(entry, spec),
    plan.liftF,
    plan.map(({ scopeRef }) => scopeRef),
  );
}
