import type { ReceiveResult, SendResult } from "@shajara/kernel";

export type TerminalChannelResult =
  | Exclude<ReceiveResult<unknown>, { kind: "value" }>
  | Exclude<SendResult, { kind: "sent" }>;

export function messageOf(result: TerminalChannelResult): string {
  switch (result.kind) {
    case "closed":
      return "Channel is closed";
    case "revoked":
      return "Channel is revoked";
  }
}
