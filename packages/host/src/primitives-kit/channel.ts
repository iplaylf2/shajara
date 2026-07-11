import type { ChannelCondition } from "#/errors/index.js";
import { ChannelError } from "#/errors/index.js";

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
