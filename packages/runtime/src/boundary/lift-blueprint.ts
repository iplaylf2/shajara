import type { Ritual, Wisp } from "@shajara/kernel";
import type { RiteRoutine, RiteCoroutine } from "#src/contracts";

export function liftBlueprint<Return>(blueprint: Ritual<Return>): RiteRoutine<Return> {
  return function* lifted(): RiteCoroutine<Return> {
    return yield* liftStep(blueprint());
  };
}

function* liftStep<Return>(wisp: Wisp<Return>): RiteCoroutine<Return> {
  if (wisp.bearing === "resting") {
    return wisp.relic;
  }

  const echo: unknown = yield wisp.sigil;

  const nextWisp = wisp.resonance(echo);

  return yield* liftStep(nextWisp);
}
