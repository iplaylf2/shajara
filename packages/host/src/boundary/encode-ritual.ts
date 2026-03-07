import type { RiteCoroutine, RiteRoutine } from "#src/contracts";
import type { Ritual, Wisp } from "@shajara/kernel";

export function encodeRitual<Relic>(ritual: Ritual<Relic>): RiteRoutine<Relic> {
  return function* encoded(): RiteCoroutine<Relic> {
    return yield* liftStep(ritual());
  };
}

function* liftStep<Relic>(wisp: Wisp<Relic>): RiteCoroutine<Relic> {
  if (wisp.bearing === "resting") {
    return wisp.relic;
  }

  const echo: unknown = yield wisp.sigil;

  const nextWisp = wisp.resonance(echo);

  return yield* liftStep(nextWisp);
}
