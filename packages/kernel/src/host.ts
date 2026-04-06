import { readonlyArray } from "fp-ts";

export function flushCallbacks(callbacks: Iterable<() => void>, message: string): void {
  const errors: unknown[] = [];

  for (const callback of callbacks) {
    try {
      callback();
    } catch (error) {
      errors.push(error);
    }
  }

  if (readonlyArray.isNonEmpty(errors)) {
    throw new AggregateError(errors, message);
  }
}
