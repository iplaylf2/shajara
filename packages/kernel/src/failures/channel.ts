import type { FailureShape } from "#/contracts";

/**
 * Channel failure value.
 *
 * @param cause - Failure cause.
 * @param message - Failure message.
 * @returns Channel failure.
 */
export function channelFailure(cause: unknown, message: string): ChannelFailure {
  return {
    cause,
    kind: "channel",
    message,
  };
}

/** Failure emitted for invalid channel input or runtime channel operation failure. */
export interface ChannelFailure extends FailureShape {
  readonly kind: "channel";
  readonly cause: unknown;
}
