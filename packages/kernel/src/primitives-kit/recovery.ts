import type { ChannelSender } from "#/sigils/index";
import type { FutureSettleKey } from "#/contracts";
import type { ScopeFailure } from "#/failures";
import { contextKey } from "#/contracts";

export const recoveryChannelKey = contextKey<ChannelSender<RecoveryRequest>>();

export interface RecoveryRequest {
  readonly failure: ScopeFailure;
  readonly recoverySettle: FutureSettleKey<unknown>;
}
