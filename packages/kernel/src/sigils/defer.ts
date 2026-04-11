import type { ECHO_TOKEN, Ritual, SigilShape } from "#/contracts";

export function defer(cleanup: Ritual<void>): DeferSigil {
  return { cleanup, kind: "defer" };
}

export interface DeferSigil extends SigilShape {
  readonly cleanup: Ritual<void>;
  readonly kind: "defer";
  // oxlint-disable-next-line no-invalid-void-type
  readonly [ECHO_TOKEN]?: readonly [void];
}
