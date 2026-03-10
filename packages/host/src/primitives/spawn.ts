import type { Failure, RiteCoroutine, RiteRoutine, ScopeRef } from "#src/contracts";
import type {
  SpawnOptions as KernelSpawnOptions,
  SpawnRecoveryHandler as KernelSpawnRecoveryHandler,
} from "@shajara/kernel";
import { decodeRitual, encodeRitual, fromFailure, toFailureUnknown } from "#src/boundary";
import { left, right, unreachable } from "@shajara/kernel/utils";
import type { Either } from "@shajara/kernel/utils";
import { ShajaraError } from "#src/contracts";
import { spawn as kernelSpawn } from "@shajara/kernel";

export function spawn<Return>(
  entry: RiteRoutine<Return>,
  options: SpawnOptions = { mode: "standard" },
): RiteCoroutine<ScopeRef<Return>> {
  return encodeRitual(() => kernelSpawn(decodeRitual(entry), toKernelSpawnOptions(options)))();
}

export type SpawnOptions = SpawnStandardOption | SpawnSupervisorOption | SpawnRecoveryOption;

export interface SpawnStandardOption {
  readonly mode: "standard";
}

export interface SpawnSupervisorOption {
  readonly mode: "supervisor";
}

export interface SpawnRecoveryOption {
  readonly mode: "recovery";
  readonly recover: SpawnRecoveryHandler;
}

export type SpawnRecoveryHandler = (error: ShajaraError) => RiteCoroutine<unknown>;

function toKernelSpawnOptions(options: SpawnOptions): KernelSpawnOptions {
  switch (options.mode) {
    case "standard":
      return { mode: "standard" };
    case "supervisor":
      return { mode: "supervisor" };
    case "recovery":
      return {
        mode: "recovery",
        recover: toKernelSpawnRecoveryHandler(options.recover),
      };
    default:
      return unreachable();
  }
}

function toKernelSpawnRecoveryHandler(recover: SpawnRecoveryHandler): KernelSpawnRecoveryHandler {
  return (failure: Failure) => decodeRitual(() => hostRecovery(recover, fromFailure(failure)))();
}

function* hostRecovery(
  recover: SpawnRecoveryHandler,
  error: ShajaraError,
): RiteCoroutine<Either<Failure, unknown>> {
  try {
    const replacement = yield* recover(error);
    return right(replacement);
  } catch (caught) {
    return left(toFailureUnknown(caught));
  }
}
