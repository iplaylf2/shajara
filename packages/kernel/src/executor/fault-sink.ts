// oxlint-disable no-magic-numbers
import type { Suppressor } from "#/contracts";
import { option } from "fp-ts";

export class FaultSink implements Disposable, Suppressor {
  public constructor(private readonly message: string) {}

  public capture(error: unknown): void {
    this.#errors.push(error);
  }

  public drain(): option.Option<unknown> {
    const errors = this.#errors;
    this.#errors = [];

    switch (errors.length) {
      case 0:
        return option.none;
      case 1:
        return option.some(errors[0]);
      default:
        return option.some(new AggregateError(errors, this.message));
    }
  }

  public throwIfAny(): void {
    const cause = this.drain();
    if (option.isSome(cause)) {
      throw cause.value;
    }
  }

  public [Symbol.dispose](): void {
    this.throwIfAny();
  }

  #errors: unknown[] = [];
}
