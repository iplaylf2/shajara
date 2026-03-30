import type { Echo, Ritual, StirringWisp, Wisp } from "#/contracts";
import type { RuntimeProcessRunnerNext } from "./runner";
import type { Sigil } from "#/sigils";
import type { TaggedUnion } from "type-fest";

export class Stepper<Relic> {
  public next(): RuntimeProcessRunnerNext<Relic> {
    switch (this.#state.kind) {
      case "echo":
        return {
          accept: (echo) => {
            this.#accept(echo as Echo<Sigil>);
          },
          kind: "echo",
          sigil: this.#state.wisp.sigil,
        };
      case "relic":
        return this.#state;
      case "resonate": {
        const state = createStateFromWisp(this.#state.resonate());
        this.#state = state;

        if (state.kind === "relic") {
          return state;
        }

        return {
          kind: "resonate",
          sigil: state.wisp.sigil,
        };
      }
    }
  }

  public constructor(worker: Ritual<Relic>) {
    this.#state = {
      kind: "resonate",
      resonate: worker,
    };
  }

  #stateAs<Kind extends StepperState<Relic>["kind"]>(
    kind: Kind,
  ): Extract<StepperState<Relic>, { readonly kind: Kind }> {
    // oxlint-disable-next-line no-void
    void kind;
    return this.#state as Extract<StepperState<Relic>, { readonly kind: Kind }>;
  }

  #accept(echo: Echo<Sigil>): void {
    const state = this.#stateAs("echo");
    this.#state = {
      kind: "resonate",
      resonate: () => state.wisp.resonate(echo),
    };
  }

  #state: StepperState<Relic>;
}

type StepperState<Relic> = TaggedUnion<
  "kind",
  {
    echo: {
      readonly wisp: StirringWisp<Sigil, Relic>;
    };
    relic: { readonly relic: Relic };
    resonate: {
      readonly resonate: () => Wisp<Relic>;
    };
  }
>;

function createStateFromWisp<Relic>(wisp: Wisp<Relic>) {
  if (wisp.bearing === "resting") {
    return {
      kind: "relic",
      relic: wisp.relic,
    } as const;
  }

  return {
    kind: "echo",
    wisp: wisp as StirringWisp<Sigil, Relic>,
  } as const;
}
