import type { FailureShape, FutureKey } from "./kernel";
import type { FutureHandle, FutureSettleKey } from "@shajara/kernel";
import type { Sigil } from "@shajara/kernel/sigils";

/** Base class for host errors that carry a shajara failure shape. */
export abstract class ShajaraError extends Error implements FailureShape {
  public abstract readonly kind: string;
  public override readonly name: string = "ShajaraError";
}

/** Callable generator entry that starts a host ritual. */
export type RiteRoutine<Return> = () => RiteCoroutine<Return>;

/** Generator coroutine that yields shajara instructions and returns a result. */
export type RiteCoroutine<Return> = Generator<Sigil, Return, unknown>;

/** Observation handle for a future result. */
export type RiteFuture<Result> = FutureKey<Result>;

/** Settlement authority for a future. */
export type RiteFutureSettle<Result> = FutureSettleKey<Result>;

/** Paired observation and settlement handles for the same future. */
export type RiteFutureHandle<Result> = FutureHandle<Result>;

/** Host tuple form for optional results: `[true, value]` is present and `[false]` is absent. */
export type Presence<Value> = readonly [true, Value] | readonly [false];
