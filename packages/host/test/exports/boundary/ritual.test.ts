import { decodeRitual, encodeRitual } from "#/boundary";
import { describe, expect, test } from "vitest";
import { restingWisp } from "@shajara/kernel";

describe("/ boundary: decodeRitual, encodeRitual", () => {
  test.for([
    {
      given: ["decoded"] as const,
      outcome: {
        decoded: {
          bearing: "resting",
          relic: "decoded",
        },
        yielded: {
          bearing: "stirring",
        },
      },
    },
  ])("decodeRitual adapts a host routine into a kernel ritual", ({ given: [value], outcome }) => {
    const ritual = decodeRitual(function* routine() {
      return value;
    });

    const decoded = ritual();

    expect(decoded).toMatchObject(outcome.yielded);

    if (decoded.bearing !== "stirring") {
      expect.unreachable();
    }

    expect(decoded.resonate(null)).toMatchObject(outcome.decoded);
  });

  test.for([
    {
      given: ["encoded"] as const,
      outcome: {
        done: true,
        value: "encoded",
      },
    },
  ])("encodeRitual adapts a kernel ritual into a host routine", ({ given: [value], outcome }) => {
    const routine = encodeRitual(() => restingWisp(value));

    expect(routine().next()).toEqual(outcome);
  });
});
