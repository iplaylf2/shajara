import { describe, expect, it } from "vitest";
import { interpretRitual, unwrapExited, unwrapRight } from "#test/harness";
import { spawn, wait } from "#/index";
import { pipe } from "fp-ts/function";
import { wisp } from "#/internal/fp";

const CHILD_RESULT = "child-done";

describe("@shajara/kernel . spawn", () => {
  it("returns a child exit future from a single primitive call", () => {
    const step = interpretRitual(() =>
      pipe(
        spawn(() => wisp.of(CHILD_RESULT)),
        wisp.chain(wait),
      ),
    ).driveSync();
    const result = unwrapRight(unwrapRight(unwrapExited(step)));

    expect(result).toBe(CHILD_RESULT);
  });
});
