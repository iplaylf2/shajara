import type { ProcessRef, Ritual, Sigil } from "#src/contracts";
import type { PartialDeep } from "type-fest";
import type { RETURN_TOKEN } from "#src/utils";
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
  readonly [RETURN_TOKEN]?: readonly [Process];
}

export interface ForkConfig {
  readonly participation: ForkParticipation;
}

export type ForkParticipation = "tracked" | "auxiliary";
