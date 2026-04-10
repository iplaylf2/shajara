import { all, wait } from "#/index";
import { describe, expect, test } from "vitest";
import { interpretRitual, unwrapExitedSucceeded, unwrapRight } from "#test/harness";
import { pipe } from "fp-ts/function";
import { wisp } from "#/internal/fp";

describe("/ primitives: all", () => {
  test.for([
    {
      given: ["alpha", "beta"] as const,
      outcome: ["alpha", "beta"],
    },
  ])(
    "returns a future key whose result preserves branch order",
    async ({ given: branches, outcome }) => {
      await using ritual = interpretRitual(() =>
        pipe(all(branches.map((branch) => () => wisp.of(branch))), wisp.chain(wait)),
      );
      const step = ritual.driveSync();
      const actual = unwrapRight(unwrapExitedSucceeded(step));

      expect(actual).toEqual(outcome);
    },
  );
});
