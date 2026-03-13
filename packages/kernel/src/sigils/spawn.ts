import type { ECHO_TOKEN, ProcessRef, Ritual, SigilShape } from "#src/contracts";
import type { PartialDeep } from "type-fest";
import defaults from "defaults";

export function spawn<Relic, Process extends ProcessRef<Relic>>(
  ritual: Ritual<Relic>,
  options?: PartialDeep<SpawnConfig>,
): SpawnSigil<Relic, Process> {
  const config = defaults(options ?? {}, { participation: "tracked" } as const);

  return {
    kind: "spawn",
    participation: config.participation,
    ritual,
  };
}

export interface SpawnSigil<Relic, Process extends ProcessRef<Relic>> extends SigilShape {
  readonly kind: "spawn";
  readonly ritual: Ritual<Relic>;
  readonly participation: SpawnParticipation;
  readonly [ECHO_TOKEN]?: readonly [Process];
}

export interface SpawnConfig {
  readonly participation: SpawnParticipation;
}

export type SpawnParticipation = "tracked" | "auxiliary";
