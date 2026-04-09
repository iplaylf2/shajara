import { describe, expect, test } from "vitest";
import { interpretRitual, unwrapExited, unwrapRight } from "#test/harness";
import { spawn, wait } from "#/index";
import { pipe } from "fp-ts/function";
import { wisp } from "#/internal/fp";

describe("/ primitives: spawn", () => {
  test.for([
    {
      given: ["spawned-done"] as const,
      outcome: "spawned-done",
    },
  ])(
    "returns the spawned process exit future from a single primitive call",
    async ({ given: [spawned], outcome }) => {
      await using ritual = interpretRitual(() =>
        pipe(
          spawn(() => wisp.of(spawned)),
          wisp.chain(wait),
        ),
      );
      const step = ritual.driveSync();
      const actual = unwrapRight(unwrapRight(unwrapExited(step)));

      expect(actual).toBe(outcome);
    },
  );
});
