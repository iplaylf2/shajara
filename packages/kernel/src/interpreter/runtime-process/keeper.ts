import type { MessageKey, ProcessRef, ScopeRef } from "#/contracts";
import type { Failure } from "#/failures";
import type { ProcessDescriptor } from "#/sigils";

export interface RuntimeProcessKeeper extends ProcessRef<unknown> {
  accept(value: unknown): void;
  cancel(): void;
  receive(messageKey: MessageKey<unknown>): void;
  stateAs<Status extends RuntimeProcessKeeperStatus>(
    status: Status,
  ): RuntimeProcessKeeperStateOf<Status>;
  takeCleanups(): CleanupTask[];
  readonly descriptor: ProcessDescriptor;
  readonly isClosed: boolean;
  readonly status: RuntimeProcessKeeperStatus;
}

export type RuntimeProcessKeeperStateOf<Status extends RuntimeProcessKeeperStatus> = Extract<
  RuntimeProcessKeeperState,
  { readonly status: Status }
>;

export type CleanupTask = (spawn: CleanupSpawner) => void;

export type RuntimeProcessKeeperState =
  | { readonly status: "running" }
  | {
      readonly status: "waiting";
    }
  | {
      readonly status: "completed";
      readonly result: unknown;
    }
  | {
      readonly status: "canceled";
    }
  | {
      readonly status: "failed";
      readonly failure: Failure;
    };

export type RuntimeProcessKeeperStatus = RuntimeProcessKeeperState["status"];

export type CleanupSpawner = (provideProcess: ProvideRuntimeProcess) => void;

export type ProvideRuntimeProcess = (
  scopeRef: ScopeRef<unknown>,
  descriptor: ProcessDescriptor,
) => RuntimeProcessKeeper;
