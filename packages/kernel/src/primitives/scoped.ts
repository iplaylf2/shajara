import type { Ritual, Failure, Wisp } from "#src/contracts";
import { awaitScopeConverged, spawnScope } from "#src/primitives-kit";
import type { Either } from "#src/utils";
import { pipe } from "fp-ts/function";
import { wisp } from "#src/internal/fp";
import { supervisorScopeSpec } from "#src/scopes";

export function scoped<Return>(entry: Ritual<Return>): Wisp<Either<Failure, Return>> {
  return pipe(spawnScope(entry, supervisorScopeSpec()), wisp.chain(awaitScopeConverged));
}
