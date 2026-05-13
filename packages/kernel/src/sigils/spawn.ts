import type {
  CompletionMode,
  ECHO_TOKEN,
  ProcessDescriptor,
  ProcessRef,
  Ritual,
  SigilShape,
} from "#/contracts";

/**
 * Creates a sigil that starts a process in the current scope.
 *
 * @param descriptor - Metadata and completion policy carried by the process reference.
 * @returns Spawn sigil whose echo is the created process reference.
 */
export function spawn<Relic, Descriptor extends ProcessDescriptor = ProcessDescriptor>(
  entry: Ritual<Relic>,
  descriptor: Descriptor = DEFAULT_PROCESS_DESCRIPTOR as Descriptor,
): SpawnSigil<Relic, Descriptor> {
  return {
    descriptor,
    entry,
    kind: "spawn",
  };
}

/** Sigil that starts a process in the current scope. */
export interface SpawnSigil<
  Relic,
  Descriptor extends ProcessDescriptor = ProcessDescriptor,
> extends SigilShape {
  readonly kind: "spawn";
  readonly descriptor: Descriptor;
  readonly entry: Ritual<Relic>;
  readonly [ECHO_TOKEN]?: readonly [ProcessRef<Relic, Descriptor>];
}

export type { CompletionMode, ProcessDescriptor };

const DEFAULT_PROCESS_DESCRIPTOR: ProcessDescriptor = { completionMode: "structural" };
