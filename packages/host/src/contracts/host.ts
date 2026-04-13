import type { FailureShape, FutureKey } from "./kernel";
import type { FutureHandle, FutureSettleKey } from "@shajara/kernel";
import type { Sigil } from "@shajara/kernel/sigils";

export type RiteRoutine<Return> = () => RiteCoroutine<Return>;

export type RiteCoroutine<Return> = Generator<Sigil, Return, unknown>;

export type RiteFuture<Result> = FutureKey<Result>;
export type RiteFutureSettle<Result> = FutureSettleKey<Result>;
export type RiteFutureHandle<Result> = FutureHandle<Result>;

export abstract class ShajaraError extends Error implements FailureShape {
  abstract readonly kind: string;
  override readonly name: string = "ShajaraError";
}
