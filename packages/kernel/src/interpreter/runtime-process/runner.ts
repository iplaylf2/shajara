import type { CleanupTask, RuntimeProcessStatus } from "./keeper";
import type {
  Echo,
  FutureResult,
  ProcessRef,
  Resonance,
  ScopeRef,
  SigilShape,
  Wisp,
} from "#/contracts";
import type { Failure } from "#/failures";
import type { RuntimeFuture } from "#/interpreter/runtime-future";
import type { SelfHandle } from "#/sigils";

export interface RuntimeProcessRunner<Relic> extends ProcessRef<Relic> {
  readonly hasQueuedContinuation: boolean;
  readonly isClosed: boolean;
  readonly result: FutureResult<Relic> | null;
  readonly status: RuntimeProcessStatus;
  wisp: Wisp<unknown>;
  defer(cleanup: CleanupTask): void;
  halt(failure: Failure): void;
  primeContinuation(continuation: Resonance<SigilShape, unknown>): void;
  resonate(): void;
  selfHandle(): SelfHandle<ScopeRef<unknown>>;
  setContinuation<SigilItem extends SigilShape>(
    resonate: Resonance<SigilItem, unknown>,
    echo: Echo<SigilItem>,
  ): void;
  wait(future: RuntimeFuture<unknown>): void;
}
