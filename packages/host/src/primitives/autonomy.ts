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

/**
 * Runs a child routine with a scheduler or reaper policy and waits for its result.
 *
 * @returns Child routine result.
 * @throws Shajara error when the autonomous scope is canceled or fails.
 */
export function* autonomy<Return>(
  entry: RiteRoutine<Return>,
  options: AutonomyOptions,
): RiteCoroutine<Return> {
  const child = yield* encodeRitual(() =>
    kernelAutonomy(decodeRitual(entry), toKernelAutonomyOptions(options)),
  )();
  return yield* waitChild(child);
}

/** Scheduler, reaper, or both for an autonomous child scope. */
export type AutonomyOptions = SchedulerOption | ReaperOption | (SchedulerOption & ReaperOption);

/** Routes runnable child processes through a scheduler. */
export interface SchedulerOption {
  /** Scheduler that assigns runnable processes in the child scope. */
  readonly scheduler: Scheduler;
}

/** Adjudicates a child scope that is closing but still waiting. */
export interface ReaperOption {
  /** Reaper routine that decides whether the child scope should keep waiting. */
  readonly reaper: Reaper;
}

/** Reaper routine for a closing autonomous scope; throw to make the scope fail. */
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
