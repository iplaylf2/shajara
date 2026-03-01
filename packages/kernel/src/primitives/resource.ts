import type { Blueprint, Channel, Failure, Plan, ScopeRef } from "#src/contracts";
import { fork, halt, receive, self, send, spawn } from "#src/syscalls";
import type { Either } from "#src/utils";
import { awaitScopeConverged } from "#src/primitives-kit";
import { channel } from "#src/contracts/channel";
import { contractViolated } from "#src/failures";
import { either } from "fp-ts";
import { pipe } from "fp-ts/function";
import { plan } from "#src/internal/fp";
import { supervisorScopeSpec } from "#src/scopes";

export function resource<ProvidedValue>(
  body: ResourceBody<ProvidedValue>,
): Plan<Either<Failure, ProvidedValue>> {
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
  );
}

export type ResourceBody<ProvidedValue> = (
  provide: ResourceProvide<ProvidedValue>,
) => Plan<unknown>;

export type ResourceProvide<ProvidedValue> = (value: ProvidedValue) => Plan<never>;

function resourceSupervisor<ProvidedValue>(
  body: ResourceBody<ProvidedValue>,
  callerRef: ScopeRef<unknown>,
  resourceChannel: Channel<Either<Failure, ProvidedValue>>,
): Blueprint<never> {
  return () =>
    pipe(
      body((value) =>
        pipe(
          send(callerRef, resourceChannel, either.right(value)),
          plan.liftF,
          plan.chain(() => suspendResourceProvider()),
        ),
      ),
      plan.chainF(() => halt(contractViolated("resource", "body completed before provide"))),
    );
}

function resourceFailureRelay<ProvidedValue>(
  supervisorRef: ScopeRef<unknown>,
  callerRef: ScopeRef<unknown>,
  resourceChannel: Channel<Either<Failure, ProvidedValue>>,
): Blueprint<void> {
  return () =>
    pipe(
      supervisorRef,
      awaitScopeConverged,
      plan.chainF((value) => send(callerRef, resourceChannel, value)),
    );
}

function suspendResourceProvider(): Plan<never> {
  return pipe(
    receive(resourceSuspendChannel),
    plan.liftF,
    plan.map(({ value }) => value),
  );
}

const resourceSuspendChannel = channel<never>();
