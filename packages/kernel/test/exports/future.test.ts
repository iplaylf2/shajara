import { cede, future, poll, settle, spawn, wait } from "#/index";
import { describe, expect, test } from "vitest";
import { interpretRitual, unwrapExited, unwrapRight } from "#test/harness";
import { isSome, none, right, some } from "#/utils";
import { pipe } from "fp-ts/function";
import { wisp } from "#/internal/fp";

describe("/ primitives: future, poll, wait", () => {
  test.for([
    {
      given: [none] as const,
      outcome: none,
    },
    {
      given: [some(right("ready"))] as const,
      outcome: some(right("ready")),
    },
  ])(
    "returns the visible future state for the current settlement state",
    ({ given: [settled], outcome }) => {
      const step = interpretRitual(() =>
        pipe(
          future<string>(),
          wisp.chain(([futureKey, futureSettle]) =>
            pipe(
              isSome(settled) ? settle(futureSettle, settled.value) : wisp.of(undefined),
              wisp.chain(() => poll(futureKey)),
            ),
          ),
        ),
      ).driveSync();
      const actual = unwrapRight(unwrapExited(step));

      expect(actual).toEqual(outcome);
    },
  );

  test.for([
    {
      given: [right("ready")] as const,
      outcome: right("ready"),
    },
  ])("returns the result produced by a spawned settlement", ({ given: [settled], outcome }) => {
    const step = interpretRitual(() =>
      pipe(
        future<string>(),
        wisp.chain(([futureKey, futureSettle]) =>
          pipe(
            spawn(() =>
              pipe(
                cede(),
                wisp.chain(() => settle(futureSettle, settled)),
              ),
            ),
            wisp.chain(() => wait(futureKey)),
          ),
        ),
      ),
    ).driveSync();
    const actual = unwrapRight(unwrapExited(step));

    expect(actual).toEqual(outcome);
  });
});
