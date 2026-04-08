import { cede, race, wait } from "#/index";
import { describe, expect, it } from "vitest";
import { interpretRitual, unwrapExited, unwrapRight } from "#test/harness";
import { pipe } from "fp-ts/function";
import { wisp } from "#/internal/fp";

const FAST_RESULT = "fast";
const SLOW_RESULT = "slow";

describe("@shajara/kernel . race", () => {
  it("returns a future key settled by the first branch to complete", () => {
    const step = interpretRitual(() =>
      pipe(
        race([
          () =>
            pipe(
              cede(),
              wisp.chain(() => wisp.of(SLOW_RESULT)),
            ),
          () => wisp.of(FAST_RESULT),
        ]),
        wisp.chain(wait),
      ),
    ).driveSync();
    const result = unwrapRight(unwrapRight(unwrapExited(step)));

    expect(result).toBe(FAST_RESULT);
  });
});
