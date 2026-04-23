import type { ChannelFailure } from "@shajara/kernel";
import { ShajaraError } from "#/contracts";

export class ChannelError extends ShajaraError implements ChannelFailure {
  public constructor(cause: unknown, message: string) {
    super(message);
    this.cause = cause;
  }

  public override readonly name = "ChannelError";
  public readonly kind = "channel" as const;
  public override readonly cause: unknown;
}
