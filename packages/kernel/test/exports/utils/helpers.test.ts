import { describe, expect, test, vi } from "vitest";
import { iife, narrowArrayAs, narrowAs, noop, unreachable } from "#/utils";

describe("/utils helpers", () => {
  describe("iife, noop", () => {
    test.for([
      {
        given: [42] as const,
        outcome: {
          iifeResult: 42,
          noopResult: undefined,
          runCalls: 1,
        },
      },
    ])("noop and iife stay as direct execution helpers", ({ given: [result], outcome }) => {
      const run = vi.fn(() => result);

      expect({
        iifeResult: iife(run),
        noopResult: noop(),
        runCalls: run.mock.calls.length,
      }).toEqual(outcome);
    });
  });

  describe("narrowArrayAs, narrowAs", () => {
    test.for([
      {
        given: [{ kind: "test" }] as const,
        outcome: {
          sameReference: true,
          value: { kind: "test" },
        },
      },
    ])("keeps narrowAs as a runtime pass-through", ({ given: [value], outcome }) => {
      const actual = narrowAs<typeof value>()(value);

      expect({
        sameReference: actual === value,
        value: actual,
      }).toEqual(outcome);
    });

    test.for([
      {
        given: [["alpha", "beta"] as const] as const,
        outcome: {
          sameReference: true,
          value: ["alpha", "beta"],
        },
      },
    ])("keeps narrowArrayAs as a runtime pass-through", ({ given: [value], outcome }) => {
      const actual = narrowArrayAs<typeof value>()(value);

      expect({
        sameReference: actual === value,
        value: actual,
      }).toEqual(outcome);
    });
  });

  describe("unreachable", () => {
    test.for([
      {
        given: [] as const,
        outcome: "Unreachable code path",
      },
    ])("unreachable throws on impossible paths", ({ outcome }) => {
      expect(() => unreachable()).toThrow(outcome);
    });
  });
});
