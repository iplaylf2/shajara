// oxlint-disable no-magic-numbers
import { option, readonlyArray } from "fp-ts";

export function flushCallbacks(message: string, callbacks: Iterable<() => void>): void {
  releaseSuppressed(suppressCallbacks(message, callbacks));
}

export function suppressCallback(callback: () => void): option.Option<unknown> {
  try {
    callback();
    return option.none;
  } catch (error) {
    return option.some(error);
  }
}

export function suppressCallbacks(
  message: string,
  callbacks: Iterable<() => void>,
): option.Option<AggregateError> {
  const errors: unknown[] = [];

  for (const callback of callbacks) {
    try {
      callback();
    } catch (error) {
      errors.push(error);
    }
  }

  if (readonlyArray.isNonEmpty(errors)) {
    return option.some(new AggregateError(errors, message));
  }

  return option.none;
}

export function releaseSuppressed(suppressed: option.Option<unknown>): void {
  if (option.isSome(suppressed)) {
    throw suppressed.value;
  }
}

export function collapseSuppressed(
  message: string,
  suppressed: readonly option.Option<unknown>[],
): option.Option<unknown> {
  const errors = Iterator.from(suppressed)
    .filter(option.isSome)
    .map((cause) => cause.value)
    .toArray();

  switch (errors.length) {
    case 0:
      return option.none;
    case 1:
      return option.some(errors[0]);
    default:
      return option.some(new AggregateError(errors, message));
  }
}
