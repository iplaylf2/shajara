import type { Echo, ProcessRef } from "#/contracts";
import type { SelfHandle, Sigil } from "#/sigils";
import type { CleanupTask } from "./keeper";
import type { Failure } from "#/failures";
import type { TaggedUnion } from "type-fest";

export interface RuntimeProcessRunner<Relic> extends ProcessRef<Relic> {
  defer(cleanup: CleanupTask): void;
  selfHandle(): SelfHandle;
  stateAs<Status extends RuntimeProcessRunnerStatus>(
    status: Status,
  ): RuntimeProcessRunnerStateOf<Relic, Status>;
  readonly isClosed: boolean;
  readonly status: RuntimeProcessRunnerStatus;
}

export type RuntimeProcessRunnerStatus = RuntimeProcessRunnerState<unknown>["status"];

export type RuntimeProcessRunnerStateOf<Relic, Status extends RuntimeProcessRunnerStatus> = Extract<
  RuntimeProcessRunnerState<Relic>,
  { readonly status: Status }
>;

export type RuntimeProcessRunnerState<Relic> = TaggedUnion<
  "status",
  {
    canceled: {};
    completed: { readonly result: Relic };
    failed: { readonly failure: Failure };
    running: { next(): RuntimeProcessRunnerNext<Relic> };
    waiting: {};
  }
>;

export type RuntimeProcessRunnerNext<Relic, SigilItem extends Sigil = Sigil> = TaggedUnion<
  "kind",
  {
    echo: {
      accept(echo: Echo<SigilItem>): void;
      readonly sigil: SigilItem;
    };
    relic: { readonly relic: Relic };
    resonate: { readonly sigil: Sigil };
  }
>;

export type RuntimeProcessNextEcho<SigilItem extends Sigil> = Extract<
  RuntimeProcessRunnerNext<never, SigilItem>,
  { readonly kind: "echo" }
>;
