import type { FailureShape, Ritual, Wisp } from "#src/contracts";
import { branch, wait } from "#src/sigils";
import type { Either } from "#src/utils";
import { pipe } from "fp-ts/function";
import { wisp } from "#src/internal/fp";

export function enclose<Relic>(entry: Ritual<Relic>): Wisp<Either<FailureShape, Relic>> {
  return pipe(
    branch(entry, { failureMode: "contain" }),
    wisp.liftF,
    wisp.chainF(({ scope }) => wait(scope.exitFuture)),
  );
}
