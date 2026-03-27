import type { FutureResult, MessageKey, ProcessRef, ScopeRef } from "#/contracts";
import type { ProcessDescriptor } from "#/sigils";
import type { Unsubscribe } from "#/interpreter-kit";

export type RuntimeProcessStatus = "running" | "waiting" | "completed" | "canceled" | "failed";

export type RuntimeProcessObserver = () => void;

export type ProvideRuntimeProcess<Relic> = (
  scopeRef: ScopeRef<unknown>,
  descriptor: ProcessDescriptor,
) => RuntimeProcessKeeper<Relic>;

export type CleanupSpawner = <Relic>(provideProcess: ProvideRuntimeProcess<Relic>) => void;

export type CleanupTask = (spawn: CleanupSpawner) => void;

export interface RuntimeProcessKeeper<Relic> extends ProcessRef<Relic> {
  readonly descriptor: ProcessDescriptor;
  readonly isClosed: boolean;
  readonly result: FutureResult<Relic> | null;
  readonly status: RuntimeProcessStatus;
  accept(value: unknown): void;
  cancel(): void;
  observe(observer: RuntimeProcessObserver): Unsubscribe;
  receive(messageKey: MessageKey<unknown>): void;
  takeCleanups(): CleanupTask[];
}
