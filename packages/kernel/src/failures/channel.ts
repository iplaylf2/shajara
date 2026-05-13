import type { FailureShape } from "#/contracts";

/**
 * Creates a failure value for invalid channel input or channel operation failure.
 *
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
  /** Channel-specific cause, such as invalid input or channel operation state. */
  readonly cause: unknown;
}
