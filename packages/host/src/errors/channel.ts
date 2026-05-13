import type { ChannelFailure, ReceiveResult, SendResult } from "@shajara/kernel";
import { ShajaraError } from "#/contracts";

/** Error thrown for terminal channel states and channel input validation failures. */
export class ChannelError extends ShajaraError implements ChannelFailure {
  /**
   * Creates a channel error.
   *
   * @param detail - Terminal channel condition or validation cause.
   * @param message - Error message.
   */
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

/** Detail attached to `ChannelError`. */
export type ChannelErrorDetail =
  | {
      readonly kind: "condition";
      readonly condition: ChannelCondition;
    }
  | {
      readonly kind: "cause";
      readonly cause: unknown;
    };

/** Terminal channel state represented by `ChannelError`. */
export type ChannelCondition =
  | Exclude<ReceiveResult<unknown, unknown>, { kind: "value" }>
  | Exclude<SendResult<unknown>, { kind: "sent" }>;
