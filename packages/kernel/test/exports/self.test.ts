import { branch, self, spawn, wait } from "#/index";
import { describe, expect, test } from "vitest";
import { interpretRitual, unwrapExitedSucceeded, unwrapRight } from "#test/harness";
import type { SelfHandle } from "#/index";
import { pipe } from "fp-ts/function";
import { wisp } from "#/internal/fp";

describe("/ primitives: self", () => {
  test.for([
    {
      given: [] as const,
      outcome: {
        hasProcessExitFuture: true,
        hasScopeExitFuture: true,
        sharesExitFuture: false,
      },
    },
  ])("returns refs whose process exit futures settle with root closure", async ({ outcome }) => {
    await using ritual = interpretRitual(() =>
      pipe(
        spawn(() => self()),
        wisp.chain(wait),
      ),
    );
    const step = ritual.driveSync();
    const actual: SelfHandle = unwrapRight(unwrapExitedSucceeded(step));

    expect({
      hasProcessExitFuture: actual.process.exitFuture !== undefined,
      hasScopeExitFuture: actual.scope.exitFuture !== undefined,
      sharesExitFuture: actual.process.exitFuture === actual.scope.exitFuture,
    }).toEqual(outcome);
  });

  test.for([
    {
      given: [
        { label: "self-scope" },
        { completionMode: "structural", label: "self-process" },
      ] as const,
      outcome: {
        processDescriptor: { completionMode: "structural", label: "self-process" },
        scopeDescriptor: { label: "self-scope" },
      },
    },
  ])(
    "returns refs with the current scope and process descriptors",
    async ({ given: [scopeDescriptor, processDescriptor], outcome }) => {
      await using ritual = interpretRitual(() =>
        pipe(
          branch(
            () =>
              pipe(
                spawn(() => self(), processDescriptor),
                wisp.chain(wait),
              ),
            scopeDescriptor,
          ),
          wisp.chain(({ scope }) => wait(scope.exitFuture)),
        ),
      );
      const step = ritual.driveSync();
      const branchExit = unwrapRight(unwrapExitedSucceeded(step));
      const actual = unwrapRight(branchExit);

      expect({
        processDescriptor: actual.process.descriptor,
        scopeDescriptor: actual.scope.descriptor,
      }).toEqual(outcome);
    },
  );
});
