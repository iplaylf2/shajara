// oxlint-disable no-magic-numbers
import type { Suppressor } from "#/contracts";
import { option } from "fp-ts";

export class FaultSink implements Suppressor {
  public capture(error: unknown): void {
    this.#errors.push(error);
  }

  public drain(message: string): option.Option<unknown> {
    const errors = this.#errors;
    this.#errors = [];

    switch (errors.length) {
      case 0:
        return option.none;
      case 1:
        return option.some(errors[0]);
      default:
        return option.some(new AggregateError(errors, message));
    }
  }

  public throwIfAny(message: string): void {
    const cause = this.drain(message);
    if (option.isSome(cause)) {
      throw cause.value;
    }
  }

  #errors: unknown[] = [];
}
