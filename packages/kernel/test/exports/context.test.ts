import { bind, contextKey, enclose, lookup, unbind } from "#/index";
import { describe, expect, test } from "vitest";
import { interpretRitual, unwrapExited, unwrapRight } from "#test/harness";
import { none, some } from "#/utils";
import type { ContextKey } from "#/index";
import { pipe } from "fp-ts/function";
import { wisp } from "#/internal/fp";

describe("/ primitives: bind, contextKey, lookup, unbind", () => {
  test.for([
    {
      expect: none,
      input: (key: ContextKey<string>) => lookup(key),
    },
  ])("lookup returns none when a binding is absent", ({ input, expect: expected }) => {
    const step = interpretRitual(() => input(contextKey())).driveSync();
    const actual = unwrapRight(unwrapExited(step));

    expect(actual).toEqual(expected);
  });

  test.for([
    {
      expect: some("root"),
      input: (key: ContextKey<string>) =>
        pipe(
          bind(key, "root"),
          wisp.chain(() => lookup(key)),
        ),
    },
  ])("bind makes the value visible in the current scope", ({ input, expect: expected }) => {
    const step = interpretRitual(() => input(contextKey())).driveSync();
    const actual = unwrapRight(unwrapExited(step));

    expect(actual).toEqual(expected);
  });

  test.for([
    {
      expect: some("root"),
      input: (key: ContextKey<string>) =>
        pipe(
          bind(key, "root"),
          wisp.chain(() => enclose(() => lookup(key))),
        ),
    },
  ])("enclosed lookup inherits the parent binding", ({ input, expect: expected }) => {
    const step = interpretRitual(() => input(contextKey())).driveSync();
    const actual = unwrapRight(unwrapRight(unwrapExited(step)));

    expect(actual).toEqual(expected);
  });

  test.for([
    {
      expect: some("child"),
      input: (key: ContextKey<string>) =>
        pipe(
          bind(key, "root"),
          wisp.chain(() =>
            enclose(() =>
              pipe(
                bind(key, "child"),
                wisp.chain(() => lookup(key)),
              ),
            ),
          ),
        ),
    },
  ])("enclosed bind shadows the parent binding", ({ input, expect: expected }) => {
    const step = interpretRitual(() => input(contextKey())).driveSync();
    const actual = unwrapRight(unwrapRight(unwrapExited(step)));

    expect(actual).toEqual(expected);
  });

  test.for([
    {
      expect: some("root"),
      input: (key: ContextKey<string>) =>
        pipe(
          bind(key, "root"),
          wisp.chain(() =>
            enclose(() =>
              pipe(
                bind(key, "child"),
                wisp.chain(() => unbind(key)),
                wisp.chain(() => lookup(key)),
              ),
            ),
          ),
        ),
    },
  ])("enclosed unbind falls back to the parent binding", ({ input, expect: expected }) => {
    const step = interpretRitual(() => input(contextKey())).driveSync();
    const actual = unwrapRight(unwrapRight(unwrapExited(step)));

    expect(actual).toEqual(expected);
  });
});
