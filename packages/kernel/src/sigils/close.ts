import type { ECHO_TOKEN, SigilShape } from "#/contracts";
import type { ChannelEndpoint } from "./channel";

/**
 * Models explicit channel closure.
 *
 * @param endpoint - Receiver or sender endpoint to close.
 * @param outcome - Explicit close outcome.
 * @returns Close instruction.
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

/** Sigil shape for closing a channel. */
export interface CloseSigil<Outcome> extends SigilShape {
  readonly kind: "close";
  readonly endpoint: ChannelEndpoint<unknown, Outcome>;
  readonly outcome: Outcome;
  // oxlint-disable-next-line no-invalid-void-type
  readonly [ECHO_TOKEN]?: readonly [void];
}
