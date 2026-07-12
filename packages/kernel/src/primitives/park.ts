import type { Wisp } from "#/contracts/index.js";
import { future } from "./future.js";
import { narrowAs } from "#/utils/index.js";
import { pipe } from "fp-ts/function";
import { wait } from "./wait.js";
import { wisp } from "#/internal/fp/index.js";

/** Parks the current process until its owning scope cancels it. */
export function park(): Wisp<never> {
  return pipe(
    future(),
    wisp.chain(([futureKey]) => wait(futureKey)),
    wisp.map(narrowAs<never>()),
  );
}
