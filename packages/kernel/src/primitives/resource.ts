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
    wisp.bindF("resourceFuture", () => future<Either<Failure, ProvidedValue>>()),
    wisp.bindF("resourceSelf", ({ resourceFuture: [, resourceSettleKey] }) =>
      spawn(resourceSupervisor(body, resourceSettleKey), supervisorScopeSpec()),
    ),
    wisp.chainFirst(({ resourceFuture: [, resourceSettleKey], resourceSelf: { scopeRef } }) =>
      forkFutureInto(scopeRef.exitFuture, resourceSettleKey, restingWisp),
    ),
    wisp.map(({ resourceFuture: [resourceFutureKey] }) => resourceFutureKey),
  );
}

export type ResourceBody<ProvidedValue> = (
  provide: ResourceProvide<ProvidedValue>,
) => Wisp<unknown>;

export type ResourceProvide<ProvidedValue> = (value: ProvidedValue) => Wisp<never>;

function resourceSupervisor<ProvidedValue>(
  body: ResourceBody<ProvidedValue>,
  resourceSettleKey: FutureSettleKey<Either<Failure, ProvidedValue>>,
): Ritual<never> {
  return () =>
    pipe(
      body((value) =>
        pipe(
          settle(resourceSettleKey, either.right(value)),
          wisp.liftF,
          wisp.chain(() => park()),
        ),
      ),
      wisp.chain(() => park()),
    );
}
