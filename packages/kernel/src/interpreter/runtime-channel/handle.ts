import type { ChannelHandle, ChannelReceiver, ChannelSender } from "#/sigils/index.js";
import type { KEY_TOKEN, ScopeRef } from "#/contracts/index.js";

export interface RuntimeChannelHandle<Value, Outcome> {
  readonly [KEY_TOKEN]: ChannelReceiver<Value, Outcome>[typeof KEY_TOKEN] &
    ChannelSender<Value, Outcome>[typeof KEY_TOKEN];
  readonly scope: ScopeRef<unknown>;

  handle(): ChannelHandle<Value, Outcome>;
}
