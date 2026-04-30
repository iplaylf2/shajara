import type { ECHO_TOKEN, ProcessRef, Ritual, SigilShape } from "#/contracts";

export function spawn<Relic>(
  entry: Ritual<Relic>,
  descriptor: ProcessDescriptor = DEFAULT_PROCESS_DESCRIPTOR,
): SpawnSigil<Relic> {
  return {
    descriptor,
    entry,
    kind: "spawn",
  };
}

export interface SpawnSigil<Relic> extends SigilShape {
  readonly kind: "spawn";
  readonly descriptor: ProcessDescriptor;
  readonly entry: Ritual<Relic>;
  readonly [ECHO_TOKEN]?: readonly [ProcessRef<Relic>];
}

export interface ProcessDescriptor {
  readonly completionMode: CompletionMode;
}

export type CompletionMode = "structural" | "detached";

const DEFAULT_PROCESS_DESCRIPTOR: ProcessDescriptor = { completionMode: "structural" };
