import type { FailureShape } from "#/contracts/index.js";

/**
 * Creates a channel failure for invalid input or channel operation failure.
 *
 * @param cause - Channel-specific value that explains the failure.
 * @param message - Caller-facing failure message.
 */
export function channelFailure(cause: unknown, message: string): ChannelFailure {
  return {
    cause,
    kind: "channel",
    message,
  };
}

/** Failure value for invalid channel input or channel operation failure. */
export interface ChannelFailure extends FailureShape {
  readonly kind: "channel";
  /** Channel-specific cause, such as invalid input or channel terminal state. */
  readonly cause: unknown;
}
