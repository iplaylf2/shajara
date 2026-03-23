import type { BindSigil } from "./bind";
import type { BranchSigil } from "./branch";
import type { CancelSigil } from "./cancel";
import type { CedeSigil } from "./cede";
import type { DeferSigil } from "./defer";
import type { FutureSigil } from "./future";
import type { HaltSigil } from "./halt";
import type { LookupSigil } from "./lookup";
import type { PollSigil } from "./poll";
import type { ReceiveSigil } from "./receive";
import type { ScopeRef } from "#src/contracts";
import type { SelfSigil } from "./self";
import type { SendSigil } from "./send";
import type { SettleSigil } from "./settle";
import type { SpawnSigil } from "./spawn";
import type { UnbindSigil } from "./unbind";
import type { WaitSigil } from "./wait";

export * from "./wait";
export * from "./bind";
export * from "./cede";
export * from "./cancel";
export * from "./defer";
export * from "./spawn";
export * from "./future";
export * from "./halt";
export * from "./lookup";
export * from "./poll";
export * from "./send";
export * from "./receive";
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
  | FutureSigil<unknown>
  | HaltSigil
  | LookupSigil<unknown>
  | PollSigil<unknown>
  | ReceiveSigil<unknown>
  | SelfSigil<ScopeRef<unknown>>
  | SendSigil<unknown>
  | SettleSigil<unknown>
  | SpawnSigil<unknown>
  | UnbindSigil
  | WaitSigil<unknown>;
