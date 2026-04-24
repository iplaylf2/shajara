import type { ChannelHandle, ChannelReceiver, ChannelSender } from "#/sigils/index";
import type { KEY_TOKEN, ScopeRef } from "#/contracts";

export interface RuntimeChannelHandle<Value, Outcome> {
  readonly [KEY_TOKEN]: ChannelReceiver<Value, Outcome>[typeof KEY_TOKEN] &
    ChannelSender<Value, Outcome>[typeof KEY_TOKEN];
  readonly scope: ScopeRef<unknown>;

  handle(): ChannelHandle<Value, Outcome>;
}
