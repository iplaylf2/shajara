// oxlint-disable class-methods-use-this
import type { FutureHandle, FutureKey, FutureResult, FutureSettleKey } from "#src/contracts";
import type { Option } from "#src/utils";
import { notImplemented } from "#src/internal/not-implemented";

export class RuntimeFuture<Result = unknown> {
  public static create<Result>(): RuntimeFuture<Result> {
    const key = {} as FutureKey<Result>;
    const settleKey = {} as FutureSettleKey<Result>;

    return new RuntimeFuture<Result>(key, settleKey);
  }

  public constructor(key: FutureKey<Result>, settleKey: FutureSettleKey<Result>) {
    this.#key = key;
    this.#settleKey = settleKey;
  }

  public poll(): Option<FutureResult<Result>> {
    return notImplemented("RuntimeFuture.poll");
  }

  public wait(_onSettled: (result: FutureResult<Result>) => void): void {
    notImplemented("RuntimeFuture.wait");
  }

  public settle(_result: FutureResult<Result>): void {
    notImplemented("RuntimeFuture.settle");
  }

  public get handle(): FutureHandle<Result> {
    return [this.#key, this.#settleKey];
  }

  readonly #key: FutureKey<Result>;
  readonly #settleKey: FutureSettleKey<Result>;
}
