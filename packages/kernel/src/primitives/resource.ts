import type { Failure, FutureKey, FutureResolverKey, Ritual, ScopeRef, Wisp } from "#src/contracts";
import { awaitScopeConverged, park } from "#src/primitives-kit";
import { fork, future, settleFuture, spawn } from "#src/sigils";
import type { Either } from "#src/utils";
import { either } from "fp-ts";
import { pipe } from "fp-ts/function";
import { supervisorScopeSpec } from "#src/scopes";
import { wisp } from "#src/internal/fp";

export function resource<ProvidedValue>(
  body: ResourceBody<ProvidedValue>,
): Wisp<FutureKey<Either<Failure, ProvidedValue>>> {
  return pipe(
    wisp.Do,
    wisp.bindF("resourceFuture", () => future<Either<Failure, ProvidedValue>>()),
    wisp.bindF("resourceSupervisorSelf", ({ resourceFuture: [, resourceFutureResolverKey] }) =>
      spawn(resourceSupervisor(body, resourceFutureResolverKey), supervisorScopeSpec()),
    ),
    wisp.chainFirstF(
      ({ resourceFuture: [, resourceFutureResolverKey], resourceSupervisorSelf: { scopeRef } }) =>
        fork(resourceFailureRelay(scopeRef, resourceFutureResolverKey)),
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
  resourceFutureResolverKey: FutureResolverKey<Either<Failure, ProvidedValue>>,
): Ritual<never> {
  return () =>
    pipe(
      body((value) =>
        pipe(
          settleFuture(resourceFutureResolverKey, either.right(value)),
          wisp.liftF,
          wisp.chain(() => park()),
        ),
      ),
      wisp.chain(() => park()),
    );
}

function resourceFailureRelay<ProvidedValue>(
  supervisorRef: ScopeRef<unknown>,
  resourceFutureResolverKey: FutureResolverKey<Either<Failure, ProvidedValue>>,
): Ritual<void> {
  return () =>
    pipe(
      supervisorRef,
      awaitScopeConverged,
      wisp.chainF((value) => settleFuture(resourceFutureResolverKey, value)),
    );
}
