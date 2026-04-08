import { describe, expect, it } from "vitest";
import type { FutureKey } from "#/index";
import { either } from "fp-ts";
import { executeEntry } from "#test/harness";
import { spawn } from "#/index";
import { wisp } from "#/internal/fp";

const CHILD_RESULT = "child-done";

describe("@shajara/kernel . spawn", () => {
  it("returns a child exit future from a single primitive call", () => {
    const execution = executeEntry(() => spawn(() => wisp.of(CHILD_RESULT))).expectExhausted();
    const futureKey = execution.entryResult as FutureKey<string>;

    expect(execution.futureResult(futureKey)).toEqual(either.right(CHILD_RESULT));
    expect(execution.suppressorErrors).toEqual([]);
  });
});
