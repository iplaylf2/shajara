import type { Wisp, ScopeCompletedExit, ScopeRef } from "#src/contracts";
import { awaitScope } from "#src/sigils";
import { narrowAs } from "#src/utils";
import { pipe } from "fp-ts/function";
import { wisp } from "#src/internal/fp";

/**
 * Awaits a child scope through the in-band completion path only.
 * Non-completed exits are treated as invalid for this helper.
 */
export function awaitScopeInBand<Return>(scopeRef: ScopeRef<Return>): Wisp<Return> {
  return pipe(
    awaitScope(scopeRef),
    wisp.liftF,
    wisp.map(narrowAs<ScopeCompletedExit<Return>>()),
    wisp.map(({ value }) => value),
  );
}
