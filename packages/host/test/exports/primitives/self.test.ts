import { describe, expect, test } from "vitest";
import { self, spawn, wait } from "#/primitives";
import type { SelfHandle } from "#/index";
import { run } from "#/index";

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
    const settled = run(function* captureSelfHandle() {
      const branchSelf = yield* spawn(function* readSelfInBranch() {
        return yield* self();
      });

      return yield* wait(branchSelf);
    });
    const actual: SelfHandle = await settled;

    expect({
      hasProcessExitFuture: actual.process.exitFuture !== undefined,
      hasScopeExitFuture: actual.scope.exitFuture !== undefined,
      sharesExitFuture: actual.process.exitFuture === actual.scope.exitFuture,
    }).toEqual(outcome);
  });
});
