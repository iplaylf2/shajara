import type { FailureShape, FutureKey } from "./kernel";
import type { FutureHandle, FutureSettleKey } from "@shajara/kernel";
import type { Sigil } from "@shajara/kernel/sigils";

export abstract class ShajaraError extends Error implements FailureShape {
  public abstract readonly kind: string;
  public override readonly name: string = "ShajaraError";
}

export type RiteRoutine<Return> = () => RiteCoroutine<Return>;
export type RiteCoroutine<Return> = Generator<Sigil, Return, unknown>;

export type RiteFuture<Result> = FutureKey<Result>;
export type RiteFutureSettle<Result> = FutureSettleKey<Result>;
export type RiteFutureHandle<Result> = FutureHandle<Result>;

export type Presence<Value> = readonly [true, Value] | readonly [false];
