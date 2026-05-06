export class ManagedDrain {
  public advanceTo(phase: ManagedDrainPhase): void {
    this.#phase = phase;
  }

  public hasReached(phase: ManagedDrainPhase): boolean {
    return DRAIN_PHASES.indexOf(this.#phase) >= DRAIN_PHASES.indexOf(phase);
  }

  public is(phase: ManagedDrainPhase): boolean {
    return this.#phase === phase;
  }

  #phase: ManagedDrainPhase = "children";
}

export type ManagedDrainPhase = (typeof DRAIN_PHASES)[number];

const DRAIN_PHASES = ["children", "structural", "detached"] as const;
