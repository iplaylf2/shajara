import type { Blueprint, ProcessRef, Syscall } from "#src/contracts";
import type { PartialDeep } from "type-fest";
import type { RETURN_TOKEN } from "#src/utils";
import defaults from "defaults";

export function fork<Return, Process extends ProcessRef<Return>>(
  blueprint: Blueprint<Return>,
  options?: PartialDeep<ForkConfig>,
): ForkSyscall<Return, Process> {
  const config = defaults(options ?? {}, { participation: "tracked" } as const);

  return {
    blueprint,
    kind: "fork",
    participation: config.participation,
  };
}

export interface ForkSyscall<Return, Process extends ProcessRef<Return>> extends Syscall {
  readonly kind: "fork";
  readonly blueprint: Blueprint<Return>;
  readonly participation: ForkParticipation;
  readonly [RETURN_TOKEN]?: readonly [Process];
}

export interface ForkConfig {
  readonly participation: ForkParticipation;
}

export type ForkParticipation = "tracked" | "auxiliary";
