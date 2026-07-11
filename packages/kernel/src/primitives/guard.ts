import type { Ritual, Wisp } from "#/contracts/index.js";
import type { BranchHandle } from "./branch.js";
// oxlint-disable-next-line unicorn/prefer-export-from -- The exported type is also used locally.
import type { RecoveryHandler } from "#/primitives-kit/index.js";
import { branch } from "./branch.js";
import { withRecoveryPoint } from "#/primitives-kit/index.js";

/**
 * Opens a child scope that handles nested `resumable(...)` recovery requests.
 *
 * @returns Guarded child scope and process references.
 */
export function guard<Relic>(
  entry: Ritual<Relic>,
  handle: RecoveryHandler,
): Wisp<BranchHandle<Relic>> {
  return branch(withRecoveryPoint(entry, handle));
}

export type { RecoveryHandler };
