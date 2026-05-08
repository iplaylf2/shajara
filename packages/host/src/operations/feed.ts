import type { ChannelReceiver, OverloadRewrite } from "#/primitives/index";
import type { RiteCoroutine } from "#/contracts";
import { channel } from "#/primitives/index";
import { channelErrorOf } from "#/primitives-kit";
import { currentExecutor } from "#/operations-kit";
import { isNone } from "@shajara/kernel/utils";

export function* feed<Value, Outcome>(
  capacity: number,
  overloadRewrite?: OverloadRewrite<Value>,
): RiteCoroutine<Feed<Value, Outcome>> {
  const executor = yield* currentExecutor();
  const [receiver, sender] = yield* channel<Value, Outcome>(capacity, overloadRewrite);

  return {
    close(outcome) {
      executor.close(sender, outcome);
    },
    receiver,
    trySend(value) {
      const result = executor.trySend(sender, value);

      if (isNone(result)) {
        return false;
      }

      switch (result.value.kind) {
        case "sent": {
          return true;
        }
        case "closed":
        case "revoked": {
          throw channelErrorOf(result.value);
        }
      }
    },
  };
}

export interface Feed<Value, Outcome> {
  readonly receiver: ChannelReceiver<Value, Outcome>;
  trySend(value: Value): boolean;
  close(outcome: Outcome): void;
}
