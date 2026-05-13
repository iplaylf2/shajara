import type { Failure } from "#/failures";
import type { Wisp } from "#/contracts";
import { halt as haltSigil } from "#/sigils/index";
import { wisp } from "#/internal/fp";

/** Converges the current process with failure and starts enclosing-scope failure convergence. */
export function halt(failure: Failure): Wisp<never> {
  return wisp.liftF(haltSigil(failure));
}
