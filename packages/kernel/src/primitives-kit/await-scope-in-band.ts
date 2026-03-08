import type { ScopeCompletedExit, ScopeRef, Wisp } from "#src/contracts";
import { awaitFuture } from "#src/primitives/await-future";
import { narrowAs } from "#src/utils";
import { pipe } from "fp-ts/function";
import { wisp } from "#src/internal/fp";

/**
 * Awaits a child scope through the in-band completion path only.
 * Non-completed exits are treated as invalid for this helper.
 */
export function awaitScopeInBand<Relic>(scopeRef: ScopeRef<Relic>): Wisp<Relic> {
  return pipe(
    awaitFuture(scopeRef.exitFuture),
    wisp.map(({ right }) => right),
    wisp.map(narrowAs<ScopeCompletedExit<Relic>>()),
    wisp.map(({ value }) => value),
  );
}
