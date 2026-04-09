import { describe, expect, test } from "vitest";
import { interpretRitual, unwrapExited, unwrapRight } from "#test/harness";
import { spawn, wait } from "#/index";
import { pipe } from "fp-ts/function";
import { wisp } from "#/internal/fp";

describe("/ primitives: spawn", () => {
  test.for([
    {
      expect: "spawned-done",
      input: () => wisp.of("spawned-done"),
    },
  ])(
    "returns the spawned process exit future from a single primitive call",
    ({ input, expect: expected }) => {
      const step = interpretRitual(() => pipe(spawn(input), wisp.chain(wait))).driveSync();
      const actual = unwrapRight(unwrapRight(unwrapExited(step)));

      expect(actual).toBe(expected);
    },
  );
});
