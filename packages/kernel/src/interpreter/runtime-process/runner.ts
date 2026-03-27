import type { Echo, ProcessRef, ScopeRef, StirringWisp } from "#/contracts";
import type { SelfHandle, Sigil } from "#/sigils";
import type { CleanupTask } from "./keeper";
import type { Failure } from "#/failures";
import type { RuntimeFuture } from "#/interpreter/runtime-future";

export interface RuntimeProcessRunner<Relic> extends ProcessRef<Relic> {
  defer(cleanup: CleanupTask): void;
  halt(failure: Failure): void;
  selfHandle(): SelfHandle<ScopeRef<unknown>>;
  stateAs<Status extends RuntimeProcessRunnerStatus>(
    status: Status,
  ): RuntimeProcessRunnerStateOf<Relic, Status>;
  wait(future: RuntimeFuture<unknown>): void;
  readonly isClosed: boolean;
  readonly status: RuntimeProcessRunnerStatus;
}

export type RuntimeProcessRunnerStatus = RuntimeProcessRunnerState<unknown>["status"];

export type RuntimeProcessRunnerStateOf<Relic, Status extends RuntimeProcessRunnerStatus> = Extract<
  RuntimeProcessRunnerState<Relic>,
  { readonly status: Status }
>;

export type RuntimeProcessRunnerState<Relic> =
  | RuntimeProcessRunningState<Relic>
  | {
      readonly status: "waiting";
    }
  | {
      readonly status: "completed";
      readonly result: Relic;
    }
  | {
      readonly status: "canceled";
    }
  | {
      readonly status: "failed";
      readonly failure: Failure;
    };

export interface RuntimeProcessRunningState<Relic> {
  readonly status: "running";
  next(): RuntimeProcessRunningNext<Sigil, Relic> | null;
}

export type RuntimeProcessRunningNext<SigilItem extends Sigil, Relic> = readonly [
  wisp: StirringWisp<SigilItem, Relic>,
  accept: (echo: Echo<SigilItem>) => void,
];
