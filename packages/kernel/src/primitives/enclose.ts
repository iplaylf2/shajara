import type { FailureShape, Ritual, Wisp } from "#/contracts";
import type { Either } from "#/utils/index";
import { branch } from "./branch";
import { pipe } from "fp-ts/function";
import { wait } from "./wait";
import { wisp } from "#/internal/fp";

export function enclose<Relic>(entry: Ritual<Relic>): Wisp<Either<FailureShape, Relic>> {
  return pipe(
    branch(entry, { failureMode: "contain" }),
    wisp.chain(({ scope }) => wait(scope.exitFuture)),
  );
}
