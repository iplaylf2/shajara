// oxlint-disable no-magic-numbers
import type { Suppressor } from "#/contracts";

export class FaultSink implements Suppressor {
  public capture(error: unknown): void {
    this.#errors.push(error);
  }

  public throwIfAny(message: string): void {
    const errors = this.#errors;
    this.#errors = [];
    switch (errors.length) {
      case 0:
        break;
      case 1:
        throw errors[0];
      default:
        throw new AggregateError(errors, message);
    }
  }

  #errors: unknown[] = [];
}
