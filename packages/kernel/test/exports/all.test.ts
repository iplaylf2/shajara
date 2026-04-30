import { all, wait } from "#/index";
import { describe, expect, test } from "vitest";
import { interpretRitual, unwrapExitedSucceeded, unwrapRight } from "#test/harness";
import { pipe } from "fp-ts/function";
import { wisp } from "#/internal/fp";

describe("/ primitives: all", () => {
  test.for([
    {
      given: [["alpha", "beta"] as const] as const,
      outcome: ["alpha", "beta"],
    },
    {
      given: [[] as const] as const,
      outcome: [] as const,
    },
  ])(
    "returns a settled future whose result preserves entry order",
    async ({ given: [values], outcome }) => {
      await using ritual = interpretRitual(() =>
        pipe(all(values.map((value) => () => wisp.of(value))), wisp.chain(wait)),
      );
      const step = ritual.driveSync();
      const actual = unwrapRight(unwrapExitedSucceeded(step));

      expect(actual).toEqual(outcome);
    },
  );
});
