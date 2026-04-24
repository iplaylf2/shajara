import type { ChannelCondition } from "#/errors";
import { ChannelError } from "#/errors";

export function channelErrorOf(condition: ChannelCondition): ChannelError {
  return new ChannelError({ condition, kind: "condition" }, messageOf(condition));
}

function messageOf(result: ChannelCondition): string {
  switch (result.kind) {
    case "closed": {
      return "Channel is closed";
    }
    case "revoked": {
      return "Channel is revoked";
    }
  }
}
