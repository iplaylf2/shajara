import type { FutureResult } from "#/contracts";
import type { TaggedUnion } from "type-fest";

export type ProcessStep<Relic> = TaggedUnion<
  "disposition",
  {
    waiting: {};
    ceded: {};
    interpreted: {};
    resonated: {};
    exited: { readonly result: FutureResult<Relic> };
  }
>;

export function processWaitingStep<Relic>(): ProcessStepOf<Relic, "waiting"> {
  return { disposition: "waiting" };
}

export function processCededStep<Relic>(): ProcessStepOf<Relic, "ceded"> {
  return { disposition: "ceded" };
}

export function processInterpretedStep<Relic>(): ProcessStepOf<Relic, "interpreted"> {
  return { disposition: "interpreted" };
}

export function processResonatedStep<Relic>(): ProcessStepOf<Relic, "resonated"> {
  return { disposition: "resonated" };
}

export function processExitedStep<Relic>(
  result: FutureResult<Relic>,
): ProcessStepOf<Relic, "exited"> {
  return { disposition: "exited", result };
}

type ProcessStepOf<Relic, Disposition extends ProcessStep<unknown>["disposition"]> = Extract<
  ProcessStep<Relic>,
  { readonly disposition: Disposition }
>;
