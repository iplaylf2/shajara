import type { BindSigil } from "./bind";
import type { BranchSigil } from "./branch";
import type { CancelSigil } from "./cancel";
import type { CedeSigil } from "./cede";
import type { ChannelSigil } from "./channel";
import type { CloseSigil } from "./close";
import type { DeferSigil } from "./defer";
import type { FutureSigil } from "./future";
import type { HaltSigil } from "./halt";
import type { LookupSigil } from "./lookup";
import type { PollSigil } from "./poll";
import type { ReceiveSigil } from "./receive";
import type { SelfSigil } from "./self";
import type { SendSigil } from "./send";
import type { SettleSigil } from "./settle";
import type { SpawnSigil } from "./spawn";
import type { TryReceiveSigil } from "./try-receive";
import type { TrySendSigil } from "./try-send";
import type { UnbindSigil } from "./unbind";
import type { WaitSigil } from "./wait";

export * from "./wait";
export * from "./bind";
export * from "./cede";
export * from "./cancel";
export * from "./channel";
export * from "./close";
export * from "./defer";
export * from "./spawn";
export * from "./future";
export * from "./halt";
export * from "./lookup";
export * from "./poll";
export * from "./send";
export * from "./receive";
export * from "./try-send";
export * from "./try-receive";
export * from "./self";
export * from "./branch";
export * from "./settle";
export * from "./unbind";

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
