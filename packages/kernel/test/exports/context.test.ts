import { bind, contextKey, enclose, lookup, unbind } from "#/index";
import { describe, expect, test } from "vitest";
import { interpretRitual, unwrapExited, unwrapRight } from "#test/harness";
import { none, some } from "#/utils";
import { pipe } from "fp-ts/function";
import { wisp } from "#/internal/fp";

describe("/ primitives: bind, contextKey, lookup, unbind", () => {
  test.for([
    {
      given: [] as const,
      outcome: none,
    },
  ])("lookup returns none when a binding is absent", ({ outcome }) => {
    const step = interpretRitual(() => lookup(contextKey<string>())).driveSync();
    const actual = unwrapRight(unwrapExited(step));

    expect(actual).toEqual(outcome);
  });

  test.for([
    {
      given: ["root"] as const,
      outcome: some("root"),
    },
  ])("bind makes the value visible in the current scope", ({ given: [binding], outcome }) => {
    const step = interpretRitual(() =>
      pipe(
        wisp.of(contextKey<string>()),
        wisp.chain((key) =>
          pipe(
            bind(key, binding),
            wisp.chain(() => lookup(key)),
          ),
        ),
      ),
    ).driveSync();
    const actual = unwrapRight(unwrapExited(step));

    expect(actual).toEqual(outcome);
  });

  test.for([
    {
      given: ["root"] as const,
      outcome: some("root"),
    },
  ])("enclosed lookup inherits the parent binding", ({ given: [binding], outcome }) => {
    const step = interpretRitual(() =>
      pipe(
        wisp.of(contextKey<string>()),
        wisp.chain((key) =>
          pipe(
            bind(key, binding),
            wisp.chain(() => enclose(() => lookup(key))),
          ),
        ),
      ),
    ).driveSync();
    const actual = unwrapRight(unwrapRight(unwrapExited(step)));

    expect(actual).toEqual(outcome);
  });

  test.for([
    {
      given: ["root", "child"] as const,
      outcome: some("child"),
    },
  ])(
    "enclosed bind shadows the parent binding",
    ({ given: [parentBinding, childBinding], outcome }) => {
      const step = interpretRitual(() =>
        pipe(
          wisp.of(contextKey<string>()),
          wisp.chain((key) =>
            pipe(
              bind(key, parentBinding),
              wisp.chain(() =>
                enclose(() =>
                  pipe(
                    bind(key, childBinding),
                    wisp.chain(() => lookup(key)),
                  ),
                ),
              ),
            ),
          ),
        ),
      ).driveSync();
      const actual = unwrapRight(unwrapRight(unwrapExited(step)));

      expect(actual).toEqual(outcome);
    },
  );

  test.for([
    {
      given: ["root", "child"] as const,
      outcome: some("root"),
    },
  ])(
    "enclosed unbind falls back to the parent binding",
    ({ given: [parentBinding, childBinding], outcome }) => {
      const step = interpretRitual(() =>
        pipe(
          wisp.of(contextKey<string>()),
          wisp.chain((key) =>
            pipe(
              bind(key, parentBinding),
              wisp.chain(() =>
                enclose(() =>
                  pipe(
                    bind(key, childBinding),
                    wisp.chain(() => unbind(key)),
                    wisp.chain(() => lookup(key)),
                  ),
                ),
              ),
            ),
          ),
        ),
      ).driveSync();
      const actual = unwrapRight(unwrapRight(unwrapExited(step)));

      expect(actual).toEqual(outcome);
    },
  );
});
