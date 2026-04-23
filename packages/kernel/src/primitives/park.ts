import { future, wait } from "#/sigils/index";
import type { Wisp } from "#/contracts";
import { narrowAs } from "#/utils/index";
import { pipe } from "fp-ts/lib/function";
import { wisp } from "#/internal/fp";

export function park(): Wisp<never> {
  return pipe(
    future(),
    wisp.liftF,
    wisp.chainF(([futureKey]) => wait(futureKey)),
    wisp.map(narrowAs<never>()),
  );
}
