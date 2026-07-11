import type { BindSigil } from "./bind.js";
import type { BranchSigil } from "./branch.js";
import type { CancelSigil } from "./cancel.js";
import type { CedeSigil } from "./cede.js";
import type { ChannelSigil } from "./channel.js";
import type { CloseSigil } from "./close.js";
import type { DeferSigil } from "./defer.js";
import type { FutureSigil } from "./future.js";
import type { HaltSigil } from "./halt.js";
import type { LookupSigil } from "./lookup.js";
import type { PollSigil } from "./poll.js";
import type { ReceiveSigil } from "./receive.js";
import type { SelfSigil } from "./self.js";
import type { SendSigil } from "./send.js";
import type { SettleSigil } from "./settle.js";
import type { SpawnSigil } from "./spawn.js";
import type { TryReceiveSigil } from "./try-receive.js";
import type { TrySendSigil } from "./try-send.js";
import type { UnbindSigil } from "./unbind.js";
import type { WaitSigil } from "./wait.js";

export * from "./wait.js";
export * from "./bind.js";
export * from "./cede.js";
export * from "./cancel.js";
export * from "./channel.js";
export * from "./close.js";
export * from "./defer.js";
export * from "./spawn.js";
export * from "./future.js";
export * from "./halt.js";
export * from "./lookup.js";
export * from "./poll.js";
export * from "./send.js";
export * from "./receive.js";
export * from "./try-send.js";
export * from "./try-receive.js";
export * from "./self.js";
export * from "./branch.js";
export * from "./settle.js";
export * from "./unbind.js";

/** Public sigil variant union interpreted by computations. */
export type Sigil =
  | BindSigil<unknown>
  | BranchSigil<unknown>
  | CancelSigil
  | CedeSigil
  | DeferSigil
  | ChannelSigil<unknown, unknown>
  | CloseSigil<unknown>
  | FutureSigil<unknown>
  | HaltSigil
  | LookupSigil<unknown>
  | PollSigil<unknown>
  | ReceiveSigil<unknown, unknown>
  | SelfSigil
  | SendSigil<unknown, unknown>
  | SettleSigil<unknown>
  | SpawnSigil<unknown>
  | TryReceiveSigil<unknown, unknown>
  | TrySendSigil<unknown, unknown>
  | UnbindSigil
  | WaitSigil<unknown>;
