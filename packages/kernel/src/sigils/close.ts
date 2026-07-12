import type { ECHO_TOKEN, SigilShape } from "#/contracts/index.js";
import type { ChannelEndpoint } from "./channel.js";

/**
 * Creates a sigil that explicitly closes a channel endpoint.
 *
 * @returns Close sigil that resumes blocked channel operations with the close outcome.
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

/** Sigil that explicitly closes a channel endpoint. */
export interface CloseSigil<Outcome> extends SigilShape {
  readonly kind: "close";
  readonly endpoint: ChannelEndpoint<unknown, Outcome>;
  readonly outcome: Outcome;
  // oxlint-disable-next-line no-invalid-void-type
  readonly [ECHO_TOKEN]?: readonly [void];
}
