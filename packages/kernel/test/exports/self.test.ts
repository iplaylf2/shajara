import { describe, expect, test } from "vitest";
import { interpretRitual, unwrapExited, unwrapRight } from "#test/harness";
import { self, spawn, wait } from "#/index";
import type { SelfHandle } from "#/index";
import { pipe } from "fp-ts/function";
import { wisp } from "#/internal/fp";

describe("/ primitives: self", () => {
  test.for([
    {
      expect: (selfHandle: SelfHandle) => {
        expect(selfHandle.process.exitFuture).toBeDefined();
        expect(selfHandle.scope.exitFuture).toBeDefined();
        expect(selfHandle.process.exitFuture).not.toBe(selfHandle.scope.exitFuture);
      },
      input: () => self(),
    },
  ])(
    "returns refs whose process exit futures settle with root closure",
    ({ input, expect: assertExpectation }) => {
      const step = interpretRitual(() => pipe(spawn(input), wisp.chain(wait))).driveSync();
      const actual: SelfHandle = unwrapRight(unwrapRight(unwrapExited(step)));

      assertExpectation(actual);
    },
  );
});
