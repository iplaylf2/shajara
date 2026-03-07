import type { Failure, Sigil } from "#src/contracts";
import type { RETURN_TOKEN } from "#src/utils";
import { scopeHalted } from "#src/failures";

export function halt(failure: Failure = scopeHalted()): HaltSyscall {
  return { failure, kind: "halt" };
}

export interface HaltSyscall extends Sigil {
  readonly failure: Failure;
  readonly kind: "halt";
  readonly [RETURN_TOKEN]?: readonly [never];
}
