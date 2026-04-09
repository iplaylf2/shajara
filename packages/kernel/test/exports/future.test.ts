import { cede, future, poll, settle, spawn, wait } from "#/index";
import { describe, expect, test } from "vitest";
import { interpretRitual, unwrapExited, unwrapRight } from "#test/harness";
import { none, right, some } from "#/utils";
import { pipe } from "fp-ts/function";
import { wisp } from "#/internal/fp";

describe("@shajara/kernel . future primitives", () => {
  describe("poll", () => {
    test.for([
      {
        expect: none,
        input: () =>
          pipe(
            future<string>(),
            wisp.chain(([futureKey]) => poll(futureKey)),
          ),
      },
      {
        expect: some(right("ready")),
        input: () =>
          pipe(
            future<string>(),
            wisp.chain(([futureKey, futureSettle]) =>
              pipe(
                settle(futureSettle, right("ready")),
                wisp.chain(() => poll(futureKey)),
              ),
            ),
          ),
      },
    ])(
      "returns the visible future state for the current settlement state",
      ({ input, expect: expected }) => {
        const step = interpretRitual(input).driveSync();
        const actual = unwrapRight(unwrapExited(step));

        expect(actual).toEqual(expected);
      },
    );
  });

  describe("wait", () => {
    test.for([
      {
        expect: right("ready"),
        input: () =>
          pipe(
            future<string>(),
            wisp.chain(([futureKey, futureSettle]) =>
              pipe(
                spawn(() =>
                  pipe(
                    cede(),
                    wisp.chain(() => settle(futureSettle, right("ready"))),
                  ),
                ),
                wisp.chain(() => wait(futureKey)),
              ),
            ),
          ),
      },
    ])("returns the result produced by a spawned settlement", ({ input, expect: expected }) => {
      const step = interpretRitual(input).driveSync();
      const actual = unwrapRight(unwrapExited(step));

      expect(actual).toEqual(expected);
    });
  });
});
