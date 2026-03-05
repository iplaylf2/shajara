import type { Failure, RuntimeBlueprint, RuntimePlan, ScopeRef } from "#src/contracts";
import type {
  SpawnOptions as KernelSpawnOptions,
  SpawnRecoveryHandler as KernelSpawnRecoveryHandler,
} from "@khora/kernel";
import { fromFailure, liftBlueprint, lowerBlueprint, toFailureUnknown } from "#src/boundary";
import { left, right } from "@khora/kernel/utils";
import type { Either } from "@khora/kernel/utils";
import { KhoraError } from "#src/contracts";
import { spawn as kernelSpawn } from "@khora/kernel";

export function spawn<Return>(
  entry: RuntimeBlueprint<Return>,
  options?: SpawnOptions,
): RuntimePlan<ScopeRef<Return>> {
  return liftBlueprint(() => kernelSpawn(lowerBlueprint(entry), toKernelSpawnOptions(options)))();
}

export type SpawnOptions = SpawnSupervisorOption | SpawnRecoveryOption;

export interface SpawnSupervisorOption {
  readonly mode: "supervisor";
}

export interface SpawnRecoveryOption {
  readonly mode: "recovery";
  readonly recover: SpawnRecoveryHandler;
}

export type SpawnRecoveryHandler = (error: KhoraError) => RuntimePlan<unknown>;

function toKernelSpawnOptions(options: SpawnOptions | undefined): KernelSpawnOptions | undefined {
  if (!options) {
    return;
  }

  if (options.mode === "supervisor") {
    return { mode: "supervisor" };
  }

  return {
    mode: "recovery",
    recover: toKernelSpawnRecoveryHandler(options.recover),
  };
}

function toKernelSpawnRecoveryHandler(recover: SpawnRecoveryHandler): KernelSpawnRecoveryHandler {
  return (failure: Failure) =>
    lowerBlueprint(() => runtimeRecovery(recover, fromFailure(failure)))();
}

function* runtimeRecovery(
  recover: SpawnRecoveryHandler,
  error: KhoraError,
): RuntimePlan<Either<Failure, unknown>> {
  try {
    const replacement = yield* recover(error);
    return right(replacement);
  } catch (caught) {
    return left(toFailureUnknown(caught));
  }
}
