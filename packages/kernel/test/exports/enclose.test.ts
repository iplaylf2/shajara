import { describe, expect, test } from "vitest";
import { enclose, halt } from "#/index";
import { interpretRitual, unwrapExited, unwrapRight } from "#test/harness";
import { left, right } from "#/utils";
import { wisp } from "#/internal/fp";

describe("/ primitives: enclose", () => {
  test.for([
    {
      expect: right("enclosed"),
      input: () => enclose(() => wisp.of("enclosed")),
    },
  ])(
    "enclose returns the child result when the enclosed scope completes",
    ({ input, expect: expected }) => {
      const step = interpretRitual(input).driveSync();
      const actual = unwrapRight(unwrapExited(step));

      expect(actual).toEqual(expected);
    },
  );

  const haltedFailure = {
    kind: "halted",
    message: "halted for test",
  } as const;

  const containedHaltFailure = left(
    expect.objectContaining({
      cause: expect.objectContaining({
        failure: haltedFailure,
      }),
    }),
  );

  test.for([
    {
      expect: containedHaltFailure,
      input: () => enclose(() => halt(haltedFailure)),
    },
  ])("enclose contains halt failures inside its result channel", ({ input, expect: expected }) => {
    const step = interpretRitual(input).driveSync();
    const actual = unwrapRight(unwrapExited(step));

    expect(actual).toEqual(expected);
  });
});
