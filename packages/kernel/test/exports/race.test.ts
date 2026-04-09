import { cede, race, wait } from "#/index";
import { describe, expect, test } from "vitest";
import { interpretRitual, unwrapExited, unwrapRight } from "#test/harness";
import { pipe } from "fp-ts/function";
import { wisp } from "#/internal/fp";

describe("@shajara/kernel . race", () => {
  test.for([
    {
      expect: "fast",
      input: [
        () =>
          pipe(
            cede(),
            wisp.chain(() => wisp.of("slow")),
          ),
        () => wisp.of("fast"),
      ] as const,
    },
  ])(
    "returns a future key settled by the first branch to complete",
    ({ input, expect: expected }) => {
      const step = interpretRitual(() => pipe(race(input), wisp.chain(wait))).driveSync();
      const actual = unwrapRight(unwrapRight(unwrapExited(step)));

      expect(actual).toBe(expected);
    },
  );
});
