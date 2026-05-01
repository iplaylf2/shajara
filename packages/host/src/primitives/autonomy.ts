import type {
  AutonomyOptions as KernelAutonomyOptions,
  Reaper as KernelReaper,
  Scheduler,
} from "@shajara/kernel";
import type { RiteCoroutine, RiteRoutine, ScopeRef } from "#/contracts";
import { decodeRitual, encodeRitual, toFailureUnknown } from "#/boundary/index";
import { none, some } from "@shajara/kernel/utils";
import { autonomy as kernelAutonomy } from "@shajara/kernel";
import { waitChild } from "#/primitives-kit";

export function* autonomy<Return>(
  entry: RiteRoutine<Return>,
  options: AutonomyOptions,
): RiteCoroutine<Return> {
  const child = yield* encodeRitual(() =>
    kernelAutonomy(decodeRitual(entry), toKernelAutonomyOptions(options)),
  )();
  return yield* waitChild(child);
}

export type AutonomyOptions = SchedulerOption | ReaperOption | (SchedulerOption & ReaperOption);

export interface SchedulerOption {
  readonly scheduler: Scheduler;
}

export interface ReaperOption {
  readonly reaper: Reaper;
}

export type Reaper = (scope: ScopeRef<unknown>) => RiteCoroutine<void>;

function toKernelAutonomyOptions(options: AutonomyOptions): KernelAutonomyOptions {
  return "reaper" in options
    ? {
        ...options,
        reaper: toKernelReaper(options.reaper),
      }
    : options;
}

function toKernelReaper(reaper: Reaper): KernelReaper {
  return {
    adjudicate: (scope) => decodeRitual(() => hostAdjudication(reaper, scope))(),
  };
}

function* hostAdjudication(reaper: Reaper, scope: ScopeRef<unknown>) {
  try {
    yield* reaper(scope);
    return none;
  } catch (error) {
    return some(toFailureUnknown(error));
  }
}
