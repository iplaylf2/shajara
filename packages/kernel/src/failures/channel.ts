import type { FailureShape } from "#/contracts";

export function channelFailure(cause: unknown, message: string): ChannelFailure {
  return {
    cause,
    kind: "channel",
    message,
  };
}

export interface ChannelFailure extends FailureShape {
  readonly kind: "channel";
  readonly cause: unknown;
}
