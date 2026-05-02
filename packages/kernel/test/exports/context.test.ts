import { bind, branch, contextKey, lookup, unbind, wait } from "#/index";
import { describe, expect, test } from "vitest";
import { interpretRitual, unwrapExitedSucceeded, unwrapRight } from "#test/harness";
import { none, some } from "#/utils";
import { pipe } from "fp-ts/function";
import { wisp } from "#/internal/fp";

describe("/ primitives: bind, contextKey, lookup, unbind", () => {
  test.for([
    {
      given: [] as const,
      outcome: none,
    },
  ])("lookup returns none when a binding is absent", async ({ outcome }) => {
    await using ritual = interpretRitual(() => lookup(contextKey<string>()));
    const step = ritual.driveSync();
    const actual = unwrapExitedSucceeded(step);

    expect(actual).toEqual(outcome);
  });

  test.for([
    {
      given: ["root"] as const,
      outcome: some("root"),
    },
  ])("bind makes the value visible in the current scope", async ({ given: [binding], outcome }) => {
    await using ritual = interpretRitual(() =>
      pipe(
        wisp.of(contextKey<string>()),
        wisp.chain((key) =>
          pipe(
            bind(key, binding),
            wisp.chain(() => lookup(key)),
          ),
        ),
      ),
    );
    const step = ritual.driveSync();
    const actual = unwrapExitedSucceeded(step);

    expect(actual).toEqual(outcome);
  });

  test.for([
    {
      given: ["root"] as const,
      outcome: some("root"),
    },
  ])("branched lookup inherits the parent binding", async ({ given: [binding], outcome }) => {
    await using ritual = interpretRitual(() =>
      pipe(
        wisp.of(contextKey<string>()),
        wisp.chain((key) =>
          pipe(
            bind(key, binding),
            wisp.chain(() =>
              pipe(
                branch(() => lookup(key)),
                wisp.chain(({ scope }) => wait(scope.exitFuture)),
              ),
            ),
          ),
        ),
      ),
    );
    const step = ritual.driveSync();
    const actual = unwrapRight(unwrapExitedSucceeded(step));

    expect(actual).toEqual(outcome);
  });

  test.for([
    {
      given: ["root", "child"] as const,
      outcome: some("child"),
    },
  ])(
    "branched bind shadows the parent binding",
    async ({ given: [parentBinding, childBinding], outcome }) => {
      await using ritual = interpretRitual(() =>
        pipe(
          wisp.of(contextKey<string>()),
          wisp.chain((key) =>
            pipe(
              bind(key, parentBinding),
              wisp.chain(() =>
                pipe(
                  branch(() =>
                    pipe(
                      bind(key, childBinding),
                      wisp.chain(() => lookup(key)),
                    ),
                  ),
                  wisp.chain(({ scope }) => wait(scope.exitFuture)),
                ),
              ),
            ),
          ),
        ),
      );
      const step = ritual.driveSync();
      const actual = unwrapRight(unwrapExitedSucceeded(step));

      expect(actual).toEqual(outcome);
    },
  );

  test.for([
    {
      given: ["root", "child"] as const,
      outcome: some("root"),
    },
  ])(
    "branched unbind falls back to the parent binding",
    async ({ given: [parentBinding, childBinding], outcome }) => {
      await using ritual = interpretRitual(() =>
        pipe(
          wisp.of(contextKey<string>()),
          wisp.chain((key) =>
            pipe(
              bind(key, parentBinding),
              wisp.chain(() =>
                pipe(
                  branch(() =>
                    pipe(
                      bind(key, childBinding),
                      wisp.chain(() => unbind(key)),
                      wisp.chain(() => lookup(key)),
                    ),
                  ),
                  wisp.chain(({ scope }) => wait(scope.exitFuture)),
                ),
              ),
            ),
          ),
        ),
      );
      const step = ritual.driveSync();
      const actual = unwrapRight(unwrapExitedSucceeded(step));

      expect(actual).toEqual(outcome);
    },
  );
});
