import type { ECHO_TOKEN, ProcessRef, Ritual, Sigil } from "#src/contracts";
import type { PartialDeep } from "type-fest";
import defaults from "defaults";

export function fork<Relic, Process extends ProcessRef<Relic>>(
  ritual: Ritual<Relic>,
  options?: PartialDeep<ForkConfig>,
): ForkSigil<Relic, Process> {
  const config = defaults(options ?? {}, { participation: "tracked" } as const);

  return {
    kind: "fork",
    participation: config.participation,
    ritual,
  };
}

export interface ForkSigil<Relic, Process extends ProcessRef<Relic>> extends Sigil {
  readonly kind: "fork";
  readonly ritual: Ritual<Relic>;
  readonly participation: ForkParticipation;
  readonly [ECHO_TOKEN]?: readonly [Process];
}

export interface ForkConfig {
  readonly participation: ForkParticipation;
}

export type ForkParticipation = "tracked" | "auxiliary";
