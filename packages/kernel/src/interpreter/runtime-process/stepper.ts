import type { Echo, Ritual, StirringWisp, Wisp } from "#/contracts";
import type { RuntimeProcessRunnerNext } from "./runner";
import type { Sigil } from "#/sigils";
import type { TaggedUnion } from "type-fest";
import { unreachable } from "#/utils";

export class Stepper<Relic> {
  public current(): RuntimeProcessRunnerNext<Relic> {
    switch (this.#state.status) {
      case "echo": {
        const { wisp } = this.#state;
        return {
          accept: (echo) => {
            this.#accept(wisp, echo as Echo<Sigil>);
          },
          kind: "echo",
          sigil: this.#state.wisp.sigil,
        };
      }
      case "relic": {
        return {
          kind: "relic",
          relic: this.#state.relic,
        };
      }
      case "resonate": {
        return unreachable();
      }
    }
  }

  public next(): RuntimeProcessRunnerNext<Relic> {
    switch (this.#state.status) {
      case "echo": {
        const { wisp } = this.#state;
        return {
          accept: (echo) => {
            this.#accept(wisp, echo as Echo<Sigil>);
          },
          kind: "echo",
          sigil: this.#state.wisp.sigil,
        };
      }
      case "relic": {
        return {
          kind: "relic",
          relic: this.#state.relic,
        };
      }
      case "resonate": {
        const wisp = this.#state.resonate();

        if (wisp.bearing === "resting") {
          this.#state = {
            relic: wisp.relic,
            status: "relic",
          };

          return {
            kind: "relic",
            relic: wisp.relic,
          };
        }

        this.#state = {
          status: "echo",
          wisp: wisp as StirringWisp<Sigil, Relic>,
        };

        return {
          kind: "resonate",
          sigil: this.#state.wisp.sigil,
        };
      }
    }
  }

  public constructor(worker: Ritual<Relic>) {
    this.#state = {
      resonate: worker,
      status: "resonate",
    };
  }

  #accept(wisp: StirringWisp<Sigil, Relic>, echo: Echo<Sigil>): void {
    this.#state = {
      resonate: () => wisp.resonate(echo),
      status: "resonate",
    };
  }

  #state: StepperState<Relic>;
}

type StepperState<Relic> = TaggedUnion<
  "status",
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
