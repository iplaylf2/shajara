import type { Wisp } from "#/contracts";
import { future } from "./future";
import { narrowAs } from "#/utils/index";
import { pipe } from "fp-ts/lib/function";
import { wait } from "./wait";
import { wisp } from "#/internal/fp";

export function park(): Wisp<never> {
  return pipe(
    future(),
    wisp.chain(([futureKey]) => wait(futureKey)),
    wisp.map(narrowAs<never>()),
  );
}
