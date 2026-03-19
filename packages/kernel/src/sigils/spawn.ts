import type { ECHO_TOKEN, ProcessDescriptor, ProcessRef, Ritual, SigilShape } from "#src/contracts";

export function spawn<Relic>(
  ritual: Ritual<Relic>,
  descriptor: ProcessDescriptor = { completionMode: "structural" },
): SpawnSigil<Relic> {
  return {
    descriptor,
    kind: "spawn",
    ritual,
  };
}

export interface SpawnSigil<Relic> extends SigilShape {
  readonly kind: "spawn";
  readonly ritual: Ritual<Relic>;
  readonly descriptor: ProcessDescriptor;
  readonly [ECHO_TOKEN]?: readonly [ProcessRef<Relic>];
}
