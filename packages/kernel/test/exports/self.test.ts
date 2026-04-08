import { describe, expect, it } from "vitest";
import type { SelfHandle } from "#/index";
import { executeEntry } from "#test/harness";
import { self } from "#/index";

describe("@shajara/kernel . self", () => {
  it("returns refs whose exit futures settle with the root closure", () => {
    const execution = executeEntry(() => self()).expectExhausted();
    const selfHandle = execution.entryResult as SelfHandle;

    expect(execution.processResult(selfHandle.process)).toMatchObject({ _tag: "Right" });
    expect(execution.scopeResult(selfHandle.scope)).toMatchObject({ _tag: "Right" });
    expect(execution.suppressorErrors).toEqual([]);
  });
});
