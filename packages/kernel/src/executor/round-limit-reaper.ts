import type { ScopeRef, Wisp } from "#/contracts";
import type { Failure } from "#/failures";
import type { Option } from "#/utils";
import type { Reaper } from "./autonomy";
import { externalFailure } from "#/failures";
import { option } from "fp-ts";
import { wisp } from "#/internal/fp";

export class RoundLimitReaper implements Reaper {
  public constructor(private readonly roundLimit: number) {}

  public adjudicate(closingScope: ScopeRef<unknown>): Wisp<Option<Failure>> {
    const state = this.#forgivenRounds.getOrInsertComputed(closingScope, () => ({
      round: 0,
    }));
    const { round } = state;
    state.round += 1;

    if (round >= this.roundLimit) {
      return wisp.of(option.some(this.#createRoundLimitFailure(round)));
    }

    return wisp.of(option.none);
  }

  #createRoundLimitFailure(round: number): Failure {
    return externalFailure(
      {
        round,
        roundLimit: this.roundLimit,
      },
      "Scope did not finish closing within the executor reaper round limit",
    );
  }

  readonly #forgivenRounds = new WeakMap<ScopeRef<unknown>, { round: number }>();
}
