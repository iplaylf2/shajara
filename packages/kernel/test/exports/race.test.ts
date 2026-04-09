import { cede, race, wait } from "#/index";
import { describe, expect, test } from "vitest";
import { interpretRitual, unwrapExited, unwrapRight } from "#test/harness";
import { pipe } from "fp-ts/function";
import { wisp } from "#/internal/fp";

describe("/ primitives: race", () => {
  test.for([
    {
      given: ["fast", "slow"] as const,
      outcome: "fast",
    },
  ])(
    "returns a future key settled by the first branch to complete",
    async ({ given: [fast, slow], outcome }) => {
      await using ritual = interpretRitual(() =>
        pipe(
          race([
            () =>
              pipe(
                cede(),
                wisp.chain(() => wisp.of(slow)),
              ),
            () => wisp.of(fast),
          ] as const),
          wisp.chain(wait),
        ),
      );
      const step = ritual.driveSync();
      const actual = unwrapRight(unwrapRight(unwrapExited(step)));

      expect(actual).toBe(outcome);
    },
  );
});
