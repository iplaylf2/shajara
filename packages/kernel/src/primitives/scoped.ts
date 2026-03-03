import type { Blueprint, Failure, Plan } from "#src/contracts";
import { awaitScopeConverged, spawnScope } from "#src/primitives-kit";
import type { Either } from "#src/utils";
import { pipe } from "fp-ts/function";
import { plan } from "#src/internal/fp";
import { supervisorScopeSpec } from "#src/scopes";

export function scoped<Return>(entry: Blueprint<Return>): Plan<Either<Failure, Return>> {
  return pipe(spawnScope(entry, supervisorScopeSpec()), plan.chain(awaitScopeConverged));
}
