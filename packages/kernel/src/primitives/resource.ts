import type { Ritual, Channel, Failure, Wisp, ScopeRef } from "#src/contracts";
import { awaitScopeConverged, park } from "#src/primitives-kit";
import { fork, receive, self, send, spawn } from "#src/syscalls";
import type { Either } from "#src/utils";
import { channel } from "#src/contracts/channel";
import { either } from "fp-ts";
import { narrowAs } from "#src/utils";
import { pipe } from "fp-ts/function";
import { plan } from "#src/internal/fp";
import { supervisorScopeSpec } from "#src/scopes";

export function resource<ProvidedValue>(
  body: ResourceBody<ProvidedValue>,
): Wisp<Either<Failure, ProvidedValue>> {
  const resourceChannel = channel<Either<Failure, ProvidedValue>>();

  return pipe(
    plan.Do,
    plan.bindF("callerSelf", self),
    plan.bindF("resourceSupervisorSelf", ({ callerSelf: { scopeRef: callerRef } }) =>
      spawn(resourceSupervisor(body, callerRef, resourceChannel), supervisorScopeSpec()),
    ),
    plan.chainF(
      ({
        callerSelf: { scopeRef: callerRef },
        resourceSupervisorSelf: { scopeRef: supervisorRef },
      }) => fork(resourceFailureRelay(supervisorRef, callerRef, resourceChannel)),
    ),
    plan.chainF(() => receive(resourceChannel)),
    plan.map(({ value }) => value),
    plan.map(narrowAs<Either<Failure, ProvidedValue>>()),
  );
}

export type ResourceBody<ProvidedValue> = (
  provide: ResourceProvide<ProvidedValue>,
) => Wisp<unknown>;

export type ResourceProvide<ProvidedValue> = (value: ProvidedValue) => Wisp<never>;

function resourceSupervisor<ProvidedValue>(
  body: ResourceBody<ProvidedValue>,
  callerRef: ScopeRef<unknown>,
  resourceChannel: Channel<Either<Failure, ProvidedValue>>,
): Ritual<never> {
  return () =>
    pipe(
      body((value) =>
        pipe(
          send(callerRef, resourceChannel, either.right(value)),
          plan.liftF,
          plan.chain(() => park()),
        ),
      ),
      plan.chain(() => park()),
    );
}

function resourceFailureRelay<ProvidedValue>(
  supervisorRef: ScopeRef<unknown>,
  callerRef: ScopeRef<unknown>,
  resourceChannel: Channel<Either<Failure, ProvidedValue>>,
): Ritual<void> {
  return () =>
    pipe(
      supervisorRef,
      awaitScopeConverged,
      plan.chainF((value) => send(callerRef, resourceChannel, value)),
    );
}
