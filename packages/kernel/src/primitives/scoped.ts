import type { Failure, Ritual, Wisp } from "#src/contracts";
import { awaitScopeConverged, spawnScope } from "#src/primitives-kit";
import type { Either } from "#src/utils";
import { pipe } from "fp-ts/function";
import { supervisorScopeSpec } from "#src/scopes";
import { wisp } from "#src/internal/fp";

export function scoped<Relic>(entry: Ritual<Relic>): Wisp<Either<Failure, Relic>> {
  return pipe(spawnScope(entry, supervisorScopeSpec()), wisp.chain(awaitScopeConverged));
}
