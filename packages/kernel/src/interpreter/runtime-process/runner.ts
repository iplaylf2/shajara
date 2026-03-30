import type { Echo, ProcessRef, ScopeRef } from "#/contracts";
import type { SelfHandle, Sigil } from "#/sigils";
import type { CleanupTask } from "./keeper";
import type { Failure } from "#/failures";

export interface RuntimeProcessRunner<Relic> extends ProcessRef<Relic> {
  defer(cleanup: CleanupTask): void;
  selfHandle(): SelfHandle<ScopeRef<unknown>>;
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

export type RuntimeProcessRunnerState<Relic> =
  | {
      readonly status: "running";
      next():
        | RuntimeProcessNextEcho<Sigil>
        | { kind: "resonate"; readonly sigil: Sigil }
        | { kind: "relic"; readonly relic: Relic };
    }
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

export type RuntimeProcessNextEcho<SigilItem extends Sigil> = {
  readonly kind: "echo";
  readonly sigil: SigilItem;
  accept: (echo: Echo<SigilItem>) => void;
};
