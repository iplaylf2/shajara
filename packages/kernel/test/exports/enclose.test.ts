import { describe, expect, test } from "vitest";
import { enclose, halt } from "#/index";
import { interpretRitual, unwrapExited, unwrapRight } from "#test/harness";
import { left, right } from "#/utils";
import { wisp } from "#/internal/fp";

describe("/ primitives: enclose", () => {
  test.for([
    {
      given: ["enclosed"] as const,
      outcome: right("enclosed"),
    },
  ])(
    "enclose returns the child result when the enclosed scope completes",
    ({ given: [enclosed], outcome }) => {
      const step = interpretRitual(() => enclose(() => wisp.of(enclosed))).driveSync();
      const actual = unwrapRight(unwrapExited(step));

      expect(actual).toEqual(outcome);
    },
  );

  test.for([
    {
      given: [
        {
          kind: "halted",
          message: "halted for test",
        },
      ] as const,
      outcome: left(
        expect.objectContaining({
          cause: expect.objectContaining({
            failure: {
              kind: "halted",
              message: "halted for test",
            },
          }),
        }),
      ),
    },
  ])(
    "enclose contains halt failures inside its result channel",
    ({ given: [failure], outcome }) => {
      const step = interpretRitual(() => enclose(() => halt(failure))).driveSync();
      const actual = unwrapRight(unwrapExited(step));

      expect(actual).toEqual(outcome);
    },
  );
});
