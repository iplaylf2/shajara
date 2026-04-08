import { canceledFailure, future } from "#/index";
import { describe, expect, it } from "vitest";
import type { FutureHandle } from "#/index";
import { either } from "fp-ts";
import { executeEntry } from "#test/harness";

describe("@shajara/kernel . future", () => {
  it("returns a future handle whose unresolved value is canceled on root closure", () => {
    const execution = executeEntry(() => future<string>()).expectExhausted();
    const futureHandle = execution.entryResult as FutureHandle<string>;
    const [futureKey] = futureHandle;

    expect(execution.futureResult(futureKey)).toEqual(either.left(canceledFailure));
    expect(execution.suppressorErrors).toEqual([]);
  });
});
