import type { ECHO_TOKEN, ProcessRef, Ritual, SigilShape } from "#/contracts";

export function spawn<Relic>(
  worker: Ritual<Relic>,
  descriptor: ProcessDescriptor = DEFAULT_PROCESS_DESCRIPTOR,
): SpawnSigil<Relic> {
  return {
    descriptor,
    kind: "spawn",
    worker,
  };
}

export interface SpawnSigil<Relic> extends SigilShape {
  readonly kind: "spawn";
  readonly descriptor: ProcessDescriptor;
  readonly worker: Ritual<Relic>;
  readonly [ECHO_TOKEN]?: readonly [ProcessRef<Relic>];
}

export interface ProcessDescriptor {
  readonly completionMode: CompletionMode;
}

export type CompletionMode = "structural" | "detached";

const DEFAULT_PROCESS_DESCRIPTOR: ProcessDescriptor = { completionMode: "structural" };
