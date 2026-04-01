import type { FutureKey, Ritual, Wisp } from "#/contracts";
import type { AutonomyOptions } from "#/executor/autonomy";
import { branch } from "#/sigils";
import { pipe } from "fp-ts/function";
import { wisp } from "#/internal/fp";
import { withAutonomy } from "#/executor/autonomy";

export function autonomy<Relic>(
  entry: Ritual<Relic>,
  options: AutonomyOptions,
): Wisp<FutureKey<Relic>> {
  return pipe(
    branch(entry, withAutonomy(options)),
    wisp.liftF,
    wisp.map(({ scope }) => scope.exitFuture),
  );
}
