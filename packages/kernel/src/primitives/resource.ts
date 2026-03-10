import type { Failure, FutureKey, FutureSettleKey, Ritual, Wisp } from "#src/contracts";
import { forkFutureInto, park } from "#src/primitives-kit";
import { future, settle, spawn } from "#src/sigils";
import type { Either } from "#src/utils";
import { either } from "fp-ts";
import { pipe } from "fp-ts/function";
import { restingWisp } from "#src/contracts";
import { supervisorScopeSpec } from "#src/scopes";
import { wisp } from "#src/internal/fp";

export function resource<ProvidedValue>(
  body: ResourceBody<ProvidedValue>,
): Wisp<FutureKey<Either<Failure, ProvidedValue>>> {
  return pipe(
    wisp.Do,
    wisp.bindF("provided", () => future<Either<Failure, ProvidedValue>>()),
    wisp.bindF("resourceSelf", ({ provided: [, providedSettle] }) =>
      spawn(resourceSupervisor(body, providedSettle), supervisorScopeSpec()),
    ),
    wisp.chainFirst(({ provided: [, providedSettle], resourceSelf: { scopeRef } }) =>
      forkFutureInto(scopeRef.exitFuture, providedSettle, restingWisp),
    ),
    wisp.map(({ provided: [providedFuture] }) => providedFuture),
  );
}

export type ResourceBody<ProvidedValue> = (
  provide: ResourceProvide<ProvidedValue>,
) => Wisp<unknown>;

export type ResourceProvide<ProvidedValue> = (value: ProvidedValue) => Wisp<never>;

function resourceSupervisor<ProvidedValue>(
  body: ResourceBody<ProvidedValue>,
  providedSettle: FutureSettleKey<Either<Failure, ProvidedValue>>,
): Ritual<never> {
  return () =>
    pipe(
      body((value) =>
        pipe(
          settle(providedSettle, either.right(value)),
          wisp.liftF,
          wisp.chain(() => park()),
        ),
      ),
      wisp.chain(() => park()),
    );
}
