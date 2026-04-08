import { all, wait } from "#/index";
import { describe, expect, it } from "vitest";
import { interpretRitual, unwrapExited, unwrapRight } from "#test/harness";
import { pipe } from "fp-ts/function";
import { wisp } from "#/internal/fp";

describe("@shajara/kernel . all", () => {
  it("returns a future key whose result preserves branch order", () => {
    const step = interpretRitual(() =>
      pipe(
        all([() => wisp.of(FIRST_RESULT), () => wisp.of(SECOND_RESULT)] as const),
        wisp.chain(wait),
      ),
    ).driveSync();
    const result = unwrapRight(unwrapRight(unwrapExited(step)));

    expect(result).toEqual([FIRST_RESULT, SECOND_RESULT]);
  });
});

const FIRST_RESULT = "alpha";
const SECOND_RESULT = "beta";
