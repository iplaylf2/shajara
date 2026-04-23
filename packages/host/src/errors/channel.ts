import type { ChannelFailure } from "@shajara/kernel";
import { ShajaraError } from "#/contracts";

export class ChannelError extends ShajaraError implements ChannelFailure {
  override readonly name = "ChannelError";
  readonly kind = "channel" as const;
  override readonly cause: unknown;

  constructor(cause: unknown, message: string) {
    super(message);
    this.cause = cause;
  }
}
