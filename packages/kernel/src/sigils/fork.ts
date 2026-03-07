import type { Ritual, ProcessRef, Sigil } from "#src/contracts";
import type { PartialDeep } from "type-fest";
import type { RETURN_TOKEN } from "#src/utils";
import defaults from "defaults";

export function fork<Return, Process extends ProcessRef<Return>>(
  blueprint: Ritual<Return>,
  options?: PartialDeep<ForkConfig>,
): ForkSyscall<Return, Process> {
  const config = defaults(options ?? {}, { participation: "tracked" } as const);

  return {
    blueprint,
    kind: "fork",
    participation: config.participation,
  };
}

export interface ForkSyscall<Return, Process extends ProcessRef<Return>> extends Sigil {
  readonly kind: "fork";
  readonly blueprint: Ritual<Return>;
  readonly participation: ForkParticipation;
  readonly [RETURN_TOKEN]?: readonly [Process];
}

export interface ForkConfig {
  readonly participation: ForkParticipation;
}

export type ForkParticipation = "tracked" | "auxiliary";
