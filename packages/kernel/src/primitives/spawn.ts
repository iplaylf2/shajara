import type { FutureKey, ProcessDescriptor, Ritual, Wisp } from "#/contracts";
import { pipe } from "fp-ts/function";
import { spawn as spawnSigil } from "#/sigils/index";
import { wisp } from "#/internal/fp";

/**
 * Starts a process in the current scope without waiting for convergence.
 *
 * @param descriptor - Metadata and completion policy carried by the process reference.
 * @returns Process exit future.
 */
export function spawn<Relic, Descriptor extends ProcessDescriptor = ProcessDescriptor>(
  entry: Ritual<Relic>,
  descriptor?: Descriptor,
): Wisp<FutureKey<Relic>> {
  return pipe(
    spawnSigil(entry, descriptor),
    wisp.liftF,
    wisp.map((process) => process.exitFuture),
  );
}
