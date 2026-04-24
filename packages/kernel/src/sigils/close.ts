import type { ECHO_TOKEN, SigilShape } from "#/contracts";
import type { ChannelEndpoint } from "./channel";

export function close<Outcome>(
  endpoint: ChannelEndpoint<unknown, Outcome>,
  outcome: Outcome,
): CloseSigil<Outcome> {
  return {
    endpoint,
    kind: "close",
    outcome,
  };
}

export interface CloseSigil<Outcome> extends SigilShape {
  readonly kind: "close";
  readonly endpoint: ChannelEndpoint<unknown, Outcome>;
  readonly outcome: Outcome;
  // oxlint-disable-next-line no-invalid-void-type
  readonly [ECHO_TOKEN]?: readonly [void];
}
