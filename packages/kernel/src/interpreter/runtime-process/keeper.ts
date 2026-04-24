import type { ProcessRef, ScopeRef } from "#/contracts";
import type { Failure } from "#/failures";
import type { FutureSettlement } from "#/interpreter/runtime-future";
import type { ProcessDescriptor } from "#/sigils/index";
import type { TaggedUnion } from "type-fest";

export interface RuntimeProcessKeeper extends ProcessRef<unknown> {
  stateAs<Status extends RuntimeProcessKeeperStatus>(
    status: Status,
  ): RuntimeProcessKeeperStateOf<Status>;
  resume(input: unknown): void;
  wait(dispose: () => void): void;
  complete(result: unknown): ProcessClosure;
  fail(failure: Failure): ProcessClosure;
  cancel(): ProcessClosure;
  readonly descriptor: ProcessDescriptor;
  readonly isClosed: boolean;
  readonly status: RuntimeProcessKeeperStatus;
}

export type RuntimeProcessKeeperStateOf<Status extends RuntimeProcessKeeperStatus> = Extract<
  RuntimeProcessKeeperState,
  { readonly status: Status }
>;

export interface ProcessClosure {
  readonly settlement: FutureSettlement;
  readonly cleanups: CleanupTask[];
}

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

export type RuntimeProcessKeeperStatus = RuntimeProcessKeeperState["status"];

// oxlint-disable-next-line id-length
export type CleanupTask = <T>(spawn: CleanupSpawner<T>) => T;

// oxlint-disable-next-line id-length
export type CleanupSpawner<T> = (provideProcess: ProvideRuntimeProcess) => T;

export type ProvideRuntimeProcess = (
  scopeRef: ScopeRef<unknown>,
  descriptor: ProcessDescriptor,
) => RuntimeProcessKeeper;
