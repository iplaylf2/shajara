import type { Ritual, Wisp } from "#/contracts";
import type { BranchHandle } from "./branch";
import type { RecoveryHandler } from "#/primitives-kit";
import { branch } from "./branch";
import { withRecoveryPoint } from "#/primitives-kit";

export function guard<Relic>(
  entry: Ritual<Relic>,
  handle: RecoveryHandler,
): Wisp<BranchHandle<Relic>> {
  return branch(withRecoveryPoint(entry, handle));
}

export type { RecoveryHandler };
