import type { Echo, ProcessRef, Resonance, ScopeRef, SigilShape, Wisp } from "#/contracts";
import type { CleanupTask } from "./keeper";
import type { Failure } from "#/failures";
import type { RuntimeFuture } from "#/interpreter/runtime-future";
import type { SelfHandle } from "#/sigils";

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

export type RuntimeProcessRunnerStateOf<Relic, Status extends RuntimeProcessRunnerStatus> = Extract<
  RuntimeProcessRunnerState<Relic>,
  { readonly status: Status }
>;

export type RuntimeProcessRunnerState<Relic> =
  | RuntimeProcessInterpretingState<Relic>
  | RuntimeProcessResonatingState
  | RuntimeProcessWaitingState
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

export interface RuntimeProcessInterpretingState<Relic> {
  readonly status: "running";
  setResonate<SigilItem extends SigilShape>(
    resonate: Resonance<SigilItem, unknown>,
    echo: Echo<SigilItem>,
  ): void;
  readonly wisp: Wisp<Relic>;
}

export interface RuntimeProcessResonatingState {
  readonly status: "running";
  resonate(): void;
}

export interface RuntimeProcessWaitingState {
  readonly status: "waiting";
  primeResonate(resonate: Resonance<SigilShape, unknown>): void;
}

export type RuntimeProcessRunnerStatus = RuntimeProcessRunnerState<unknown>["status"];
