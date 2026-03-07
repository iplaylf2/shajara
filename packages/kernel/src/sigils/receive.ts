import type { Channel, ScopeRef, Sigil } from "#src/contracts";
import type { RETURN_TOKEN } from "#src/utils";

export function receive<ReceiveValue>(
  channel: Channel<ReceiveValue>,
): ReceiveSigil<ReceiveValue> {
  return {
    channel,
    kind: "receive",
  };
}

export interface ReceiveSigil<ReceiveValue> extends Sigil {
  readonly kind: "receive";
  readonly channel: Channel<ReceiveValue>;
  readonly [RETURN_TOKEN]?: readonly [ReceiveResult<ReceiveValue>];
}

export interface ReceiveResult<ReceiveValue> {
  readonly value: ReceiveValue;
  readonly from: ScopeRef<unknown>;
}
