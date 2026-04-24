import type { ChannelFailure, ReceiveResult, SendResult } from "@shajara/kernel";
import { ShajaraError } from "#/contracts";

export class ChannelError extends ShajaraError implements ChannelFailure {
  public constructor(
    public readonly detail: ChannelErrorDetail,
    message: string,
  ) {
    super(message);

    this.cause = detail.kind === "cause" ? detail.cause : null;
  }

  public override readonly name = "ChannelError";
  public readonly kind = "channel" as const;
  public override readonly cause: unknown;
}

export type ChannelErrorDetail =
  | {
      readonly kind: "condition";
      readonly condition: ChannelCondition;
    }
  | {
      readonly kind: "cause";
      readonly cause: unknown;
    };

export type ChannelCondition =
  | Exclude<ReceiveResult<unknown, unknown>, { kind: "value" }>
  | Exclude<SendResult<unknown>, { kind: "sent" }>;
