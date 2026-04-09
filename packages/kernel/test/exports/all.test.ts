import { all, wait } from "#/index";
import { describe, expect, test } from "vitest";
import { interpretRitual, unwrapExited, unwrapRight } from "#test/harness";
import { pipe } from "fp-ts/function";
import { wisp } from "#/internal/fp";

describe("@shajara/kernel . all", () => {
  test.for([
    {
      expect: ["alpha", "beta"],
      input: [() => wisp.of("alpha"), () => wisp.of("beta")],
    },
  ])("returns a future key whose result preserves branch order", ({ input, expect: expected }) => {
    const step = interpretRitual(() => pipe(all(input), wisp.chain(wait))).driveSync();
    const actual = unwrapRight(unwrapRight(unwrapExited(step)));

    expect(actual).toEqual(expected);
  });
});
