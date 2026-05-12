import type { FutureKey, ProcessDescriptor, Ritual, Wisp } from "#/contracts";
import { pipe } from "fp-ts/function";
import { spawn as spawnSigil } from "#/sigils/index";
import { wisp } from "#/internal/fp";

/**
 * Starts a process in the current scope.
 *
 * @param entry - Process entry.
 * @param descriptor - Process metadata.
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
