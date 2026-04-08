import { describe, expect, it, vi } from "vitest";
import { iife, narrowArrayAs, narrowAs, noop, unreachable } from "#/utils";

const EXPECTED_CALLS = 1;
const EXPECTED_RESULT = 42;

describe("@shajara/kernel/utils execution", () => {
  it("keeps noop and iife as direct execution helpers", () => {
    const run = vi.fn(() => EXPECTED_RESULT);

    expect(noop()).toBeUndefined();
    expect(iife(run)).toBe(EXPECTED_RESULT);
    expect(run).toHaveBeenCalledTimes(EXPECTED_CALLS);
  });

  it("keeps narrowing helpers as runtime pass-through functions", () => {
    const object = { kind: "test" } as const;
    const tuple = ["alpha", "beta"] as const;

    expect(narrowAs<typeof object>()(object)).toBe(object);
    expect(narrowArrayAs<typeof tuple>()(tuple)).toBe(tuple);
  });

  it("throws on unreachable paths", () => {
    expect(() => unreachable()).toThrowError("Unreachable code path");
  });
});
