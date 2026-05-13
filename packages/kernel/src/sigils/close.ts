import type { ECHO_TOKEN, SigilShape } from "#/contracts";
import type { ChannelEndpoint } from "./channel";

/**
 * Encodes explicit channel close as a sigil.
 *
 * @returns `close` sigil.
 */
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

/** Channel close sigil. */
export interface CloseSigil<Outcome> extends SigilShape {
  readonly kind: "close";
  readonly endpoint: ChannelEndpoint<unknown, Outcome>;
  readonly outcome: Outcome;
  // oxlint-disable-next-line no-invalid-void-type
  readonly [ECHO_TOKEN]?: readonly [void];
}
