import { describe, expect, test } from "vitest";
import { interpretRitual, unwrapExited, unwrapRight } from "#test/harness";
import { self, spawn, wait } from "#/index";
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
  ])("returns refs whose process exit futures settle with root closure", ({ outcome }) => {
    const step = interpretRitual(() =>
      pipe(
        spawn(() => self()),
        wisp.chain(wait),
      ),
    ).driveSync();
    const actual: SelfHandle = unwrapRight(unwrapRight(unwrapExited(step)));

    expect({
      hasProcessExitFuture: actual.process.exitFuture !== undefined,
      hasScopeExitFuture: actual.scope.exitFuture !== undefined,
      sharesExitFuture: actual.process.exitFuture === actual.scope.exitFuture,
    }).toEqual(outcome);
  });
});
