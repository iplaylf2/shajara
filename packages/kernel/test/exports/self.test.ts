import { describe, expect, it } from "vitest";
import { interpretRitual, unwrapExited, unwrapRight } from "#test/harness";
import { self, spawn, wait } from "#/index";
import { pipe } from "fp-ts/function";
import { wisp } from "#/internal/fp";

describe("@shajara/kernel . self", () => {
  it("returns refs whose process exit futures settle with root closure", () => {
    const step = interpretRitual(() =>
      pipe(
        spawn(() => self()),
        wisp.chain(wait),
      ),
    ).driveSync();
    const selfHandle = unwrapRight(unwrapRight(unwrapExited(step)));

    expect(selfHandle.process.exitFuture).toBeDefined();
    expect(selfHandle.scope.exitFuture).toBeDefined();
    expect(selfHandle.process.exitFuture).not.toBe(selfHandle.scope.exitFuture);
  });
});
