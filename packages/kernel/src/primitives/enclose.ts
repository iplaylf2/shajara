import type { FailureShape, Ritual, Wisp } from "#/contracts";
import { branch, wait } from "#/sigils/index";
import type { Either } from "#/utils/index";
import { pipe } from "fp-ts/function";
import { wisp } from "#/internal/fp";

export function enclose<Relic>(entry: Ritual<Relic>): Wisp<Either<FailureShape, Relic>> {
  return pipe(
    branch(entry, { failureMode: "contain" }),
    wisp.liftF,
    wisp.chainF(({ scope }) => wait(scope.exitFuture)),
  );
}
