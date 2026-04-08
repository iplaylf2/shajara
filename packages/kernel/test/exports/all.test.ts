import { describe, expect, it } from "vitest";
import type { FutureKey } from "#/index";
import { all } from "#/index";
import { either } from "fp-ts";
import { executeEntry } from "#test/harness";
import { wisp } from "#/internal/fp";

const FIRST_RESULT = "alpha";
const SECOND_RESULT = "beta";

describe("@shajara/kernel . all", () => {
  it("returns a future key whose result preserves branch order", () => {
    const execution = executeEntry(() =>
      all([() => wisp.of(FIRST_RESULT), () => wisp.of(SECOND_RESULT)] as const),
    ).expectExhausted();
    const futureKey = execution.entryResult as FutureKey<readonly [string, string]>;

    expect(execution.futureResult(futureKey)).toEqual(either.right([FIRST_RESULT, SECOND_RESULT]));
    expect(execution.suppressorErrors).toEqual([]);
  });
});
