import type { FailureShape } from "#/contracts";

/**
 * Returns an in-band channel failure for invalid input or channel operation failure.
 *
 * @param cause - Channel-specific value that explains the failure.
 * @param message - Caller-facing failure message.
 * @returns Channel failure value.
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
