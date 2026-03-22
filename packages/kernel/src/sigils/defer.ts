import type { ECHO_TOKEN, Ritual, SigilShape } from "#src/contracts";

export function defer(cleanup: Ritual<void>): DeferSigil {
  return { cleanup, kind: "defer" };
}

export interface DeferSigil extends SigilShape {
  readonly cleanup: Ritual<void>;
  readonly kind: "defer";
  readonly [ECHO_TOKEN]?: readonly [void];
}
