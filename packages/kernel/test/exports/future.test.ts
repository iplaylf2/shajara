import { describe, expect, it } from "vitest";
import { interpretRitual, unwrapExited, unwrapRight } from "#test/harness";
import { future } from "#/index";

describe("@shajara/kernel . future", () => {
  it("returns a future handle from a single primitive call", () => {
    const step = interpretRitual(() => future<string>()).driveSync();
    const futureHandle = unwrapRight(unwrapExited(step));
    const [futureKey, futureSettle] = futureHandle;

    expect(futureKey).toBe(futureSettle);
  });
});
