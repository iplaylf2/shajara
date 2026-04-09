import { all, wait } from "#/index";
import { describe, expect, test } from "vitest";
import { interpretRitual, unwrapExited, unwrapRight } from "#test/harness";
import { pipe } from "fp-ts/function";
import { wisp } from "#/internal/fp";

describe("/ primitives: all", () => {
  test.for([
    {
      given: ["alpha", "beta"] as const,
      outcome: ["alpha", "beta"],
    },
  ])("returns a future key whose result preserves branch order", ({ given: branches, outcome }) => {
    const step = interpretRitual(() =>
      pipe(all(branches.map((branch) => () => wisp.of(branch))), wisp.chain(wait)),
    ).driveSync();
    const actual = unwrapRight(unwrapRight(unwrapExited(step)));

    expect(actual).toEqual(outcome);
  });
});
