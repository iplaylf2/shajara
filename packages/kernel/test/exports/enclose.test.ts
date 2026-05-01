import { cede, enclose, halt } from "#/index";
import { describe, expect, test } from "vitest";
import { interpretRitual, unwrapExitedSucceeded } from "#test/harness";
import { left, right } from "#/utils";
import { pipe } from "fp-ts/function";
import { wisp } from "#/internal/fp";

describe("/ primitives: enclose", () => {
  test.for([
    {
      given: ["enclosed"] as const,
      outcome: right("enclosed"),
    },
  ])(
    "enclose returns the branch handle without waiting for the child scope",
    async ({ given: [enclosed], outcome }) => {
      await using ritual = interpretRitual(() =>
        enclose(() =>
          pipe(
            cede(),
            wisp.chain(() => wisp.of(enclosed)),
          ),
        ),
      );
      const step = ritual.driveSync();
      const handle = unwrapExitedSucceeded(step);
      const actual = await ritual.waitForFuture(handle.scope.exitFuture);

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
    },
  ])("enclose contains halt failures inside its result channel", async ({ given: [failure] }) => {
    await using ritual = interpretRitual(() => enclose(() => halt(failure)));
    const step = ritual.driveSync();
    const handle = unwrapExitedSucceeded(step);
    const actual = await ritual.waitForFuture(handle.scope.exitFuture);

    expect(actual).toEqual(
      left(
        expect.objectContaining({
          cause: expect.objectContaining({
            failure,
          }),
        }),
      ),
    );
  });
});
