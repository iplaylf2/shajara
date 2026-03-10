import type { ScopeRef, Wisp } from "#src/contracts";
import type { Right } from "#src/utils";
import { narrowAs } from "#src/utils";
import { pipe } from "fp-ts/function";
import { wait } from "#src/primitives/wait";
import { wisp } from "#src/internal/fp";

/**
 * Awaits a child scope through the in-band completion path only.
 * Non-completed exits are treated as invalid for this helper.
 */
export function awaitScopeInBand<Relic>(scopeRef: ScopeRef<Relic>): Wisp<Relic> {
  return pipe(
    wait(scopeRef.exitFuture),
    wisp.map(narrowAs<Right<Relic>>()),
    wisp.map(({ right }) => right),
  );
}
