import type { Blueprint, Plan, ScopeRef, ScopeSpec } from "#src/contracts";
import { pipe } from "fp-ts/function";
import { plan } from "#src/internal/fp";
import { spawn } from "#src/syscalls";

export function spawnScope<Return>(
  entry: Blueprint<Return>,
  spec: ScopeSpec,
): Plan<ScopeRef<Return>> {
  return pipe(
    spawn(entry, spec),
    plan.liftF,
    plan.map(({ scopeRef }) => scopeRef),
  );
}
