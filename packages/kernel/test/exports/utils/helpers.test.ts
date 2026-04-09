import { describe, expect, test, vi } from "vitest";
import { iife, narrowArrayAs, narrowAs, noop, unreachable } from "#/utils";

describe("/utils helpers", () => {
  describe("iife, noop", () => {
    const EXPECTED_CALLS = 1;
    const EXPECTED_RESULT = 42;

    test.for([
      {
        expect: {
          iifeResult: EXPECTED_RESULT,
          noopResult: undefined,
          runCalls: EXPECTED_CALLS,
        },
        input: () => {
          const run = vi.fn(() => EXPECTED_RESULT);

          return {
            iifeResult: iife(run),
            noopResult: noop(),
            runCalls: run.mock.calls.length,
          };
        },
      },
    ])("noop and iife stay as direct execution helpers", ({ input, expect: expected }) => {
      expect(input()).toEqual(expected);
    });
  });

  describe("narrowArrayAs, narrowAs", () => {
    const objectValue = { kind: "test" } as const;
    const tupleValue = ["alpha", "beta"] as const;

    test.for([
      {
        expect: objectValue,
        input: objectValue,
      },
    ])("keeps narrowAs as a runtime pass-through", ({ input, expect: expected }) => {
      expect(narrowAs<typeof input>()(input)).toBe(expected);
    });

    test.for([
      {
        expect: tupleValue,
        input: tupleValue,
      },
    ])("keeps narrowArrayAs as a runtime pass-through", ({ input, expect: expected }) => {
      expect(narrowArrayAs<typeof input>()(input)).toBe(expected);
    });
  });

  describe("unreachable", () => {
    test.for([
      {
        expect: "Unreachable code path",
        input: unreachable,
      },
    ])("unreachable throws on impossible paths", ({ input, expect: expected }) => {
      expect(input).toThrow(expected);
    });
  });
});
