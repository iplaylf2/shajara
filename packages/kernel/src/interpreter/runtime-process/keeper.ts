import type { ProcessRef, ScopeRef } from "#/contracts";
import type { Failure } from "#/failures";
import type { ProcessDescriptor } from "#/sigils";
import type { TaggedUnion } from "type-fest";

export interface RuntimeProcessKeeper extends ProcessRef<unknown> {
  stateAs<Status extends RuntimeProcessKeeperStatus>(
    status: Status,
  ): RuntimeProcessKeeperStateOf<Status>;
  transitionTo(state: RuntimeProcessKeeperTransition): void;
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

export type RuntimeProcessKeeperState = TaggedUnion<
  "status",
  {
    canceled: {};
    completed: { readonly result: unknown };
    failed: { readonly failure: Failure };
    running: {};
    waiting: {};
  }
>;

export type RuntimeProcessKeeperTransition = TaggedUnion<
  "status",
  {
    canceled: {};
    completed: { readonly result: unknown };
    failed: { readonly failure: Failure };
    running: { input: unknown };
    waiting: { dispose(): void };
  }
>;

export type RuntimeProcessKeeperStatus = RuntimeProcessKeeperState["status"];

export type CleanupSpawner = (provideProcess: ProvideRuntimeProcess) => void;

export type ProvideRuntimeProcess = (
  scopeRef: ScopeRef<unknown>,
  descriptor: ProcessDescriptor,
) => RuntimeProcessKeeper;
