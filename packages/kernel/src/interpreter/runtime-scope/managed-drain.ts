export class ManagedDrain {
  public advanceTo(phase: ManagedDrainPhase): void {
    this.#phaseRank = DRAIN_PHASE_RANK[phase];
  }

  public hasReached(phase: ManagedDrainPhase): boolean {
    return this.#phaseRank >= DRAIN_PHASE_RANK[phase];
  }

  public is(phase: ManagedDrainPhase): boolean {
    return this.#phaseRank === DRAIN_PHASE_RANK[phase];
  }

  #phaseRank: ManagedDrainPhaseRank = DRAIN_PHASE_RANK.children;
}

export type ManagedDrainPhase = keyof typeof DRAIN_PHASE_RANK;

type ManagedDrainPhaseRank = (typeof DRAIN_PHASE_RANK)[ManagedDrainPhase];

const DRAIN_PHASE_RANK = {
  children: 0,
  detached: 2,
  structural: 1,
} as const;
