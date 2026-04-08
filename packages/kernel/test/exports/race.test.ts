import { cede, race } from "#/index";
import { describe, expect, it } from "vitest";
import type { FutureKey } from "#/index";
import { either } from "fp-ts";
import { executeEntry } from "#test/harness";
import { pipe } from "fp-ts/function";
import { wisp } from "#/internal/fp";

const FAST_RESULT = "fast";
const SLOW_RESULT = "slow";

describe("@shajara/kernel . race", () => {
  it("returns a future key settled by the first branch to complete", () => {
    const execution = executeEntry(() =>
      pipe(
        race([
          () =>
            pipe(
              cede(),
              wisp.chain(() => wisp.of(SLOW_RESULT)),
            ),
          () => wisp.of(FAST_RESULT),
        ]),
      ),
    ).expectExhausted();
    const futureKey = execution.entryResult as FutureKey<string>;

    expect(execution.futureResult(futureKey)).toEqual(either.right(FAST_RESULT));
    expect(execution.suppressorErrors).toEqual([]);
  });
});
