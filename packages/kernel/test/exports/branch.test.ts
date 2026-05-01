import { branch, cede, halt } from "#/index";
import { describe, expect, test } from "vitest";
import { interpretRitual, unwrapExitedSucceeded } from "#test/harness";
import { left, right } from "#/utils";
import { pipe } from "fp-ts/function";
import { wisp } from "#/internal/fp";

describe("/ primitives: branch", () => {
  test.for([
    {
      given: [{ label: "branch-scope" }, "branched"] as const,
      outcome: {
        processDescriptor: { completionMode: "structural" },
        result: right("branched"),
        scopeDescriptor: { label: "branch-scope" },
      },
    },
  ])(
    "returns the branch handle without waiting for the child scope",
    async ({ given: [descriptor, branched], outcome }) => {
      await using ritual = interpretRitual(() =>
        pipe(
          branch(
            () =>
              pipe(
                cede(),
                wisp.chain(() => wisp.of(branched)),
              ),
            descriptor,
          ),
          wisp.map((handle) => ({
            handle,
            processDescriptor: handle.process.descriptor,
            scopeDescriptor: handle.scope.descriptor,
          })),
        ),
      );
      const step = ritual.driveSync();
      const { handle, processDescriptor, scopeDescriptor } = unwrapExitedSucceeded(step);
      const actual = {
        processDescriptor,
        result: await ritual.waitForFuture(handle.scope.exitFuture),
        scopeDescriptor,
      };

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
  ])("contains halt failures inside its result channel", async ({ given: [failure], outcome }) => {
    await using ritual = interpretRitual(() => branch(() => halt(failure)));
    const step = ritual.driveSync();
    const handle = unwrapExitedSucceeded(step);
    const actual = await ritual.waitForFuture(handle.scope.exitFuture);

    expect(actual).toEqual(outcome);
  });
});
