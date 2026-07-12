import type { Failure } from "#/failures/index.js";
import type { Wisp } from "#/contracts/index.js";
import { halt as haltSigil } from "#/sigils/index.js";
import { wisp } from "#/internal/fp/index.js";

/** Converges the current process with failure and starts owning-scope failure convergence. */
export function halt(failure: Failure): Wisp<never> {
  return wisp.liftF(haltSigil(failure));
}
