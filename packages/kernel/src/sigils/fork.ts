import type { Ritual, ProcessRef, Sigil } from "#src/contracts";
import type { PartialDeep } from "type-fest";
import type { RETURN_TOKEN } from "#src/utils";
import defaults from "defaults";

export function fork<Return, Process extends ProcessRef<Return>>(
  ritual: Ritual<Return>,
  options?: PartialDeep<ForkConfig>,
): ForkSigil<Return, Process> {
  const config = defaults(options ?? {}, { participation: "tracked" } as const);

  return {
    ritual,
    kind: "fork",
    participation: config.participation,
  };
}

export interface ForkSigil<Return, Process extends ProcessRef<Return>> extends Sigil {
  readonly kind: "fork";
  readonly ritual: Ritual<Return>;
  readonly participation: ForkParticipation;
  readonly [RETURN_TOKEN]?: readonly [Process];
}

export interface ForkConfig {
  readonly participation: ForkParticipation;
}

export type ForkParticipation = "tracked" | "auxiliary";
