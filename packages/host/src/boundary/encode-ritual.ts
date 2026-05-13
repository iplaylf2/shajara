import type { RiteCoroutine, RiteRoutine } from "#/contracts";
import type { Ritual, Wisp } from "@shajara/kernel";
import type { Sigil } from "@shajara/kernel/sigils";

/** Converts a kernel `Ritual` into a host `RiteRoutine`. */
export function encodeRitual<Relic>(ritual: Ritual<Relic>): RiteRoutine<Relic> {
  return function* encoded(): RiteCoroutine<Relic> {
    return yield* liftStep(ritual());
  };
}

function* liftStep<Relic>(wisp: Wisp<Relic>): RiteCoroutine<Relic> {
  if (wisp.bearing === "resting") {
    return wisp.relic;
  }

  const echo = yield wisp.sigil as Sigil;

  const nextWisp = wisp.resonate(echo);

  return yield* liftStep(nextWisp);
}
