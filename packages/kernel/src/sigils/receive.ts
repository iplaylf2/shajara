import type { Channel, ECHO_TOKEN, ScopeRef, Sigil } from "#src/contracts";

export function receive<ReceiveValue>(channel: Channel<ReceiveValue>): ReceiveSigil<ReceiveValue> {
  return {
    channel,
    kind: "receive",
  };
}

export interface ReceiveSigil<ReceiveValue> extends Sigil {
  readonly kind: "receive";
  readonly channel: Channel<ReceiveValue>;
  readonly [ECHO_TOKEN]?: readonly [ReceiveResult<ReceiveValue>];
}

export interface ReceiveResult<ReceiveValue> {
  readonly value: ReceiveValue;
  readonly from: ScopeRef<unknown>;
}
