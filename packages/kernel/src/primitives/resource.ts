import type { Ritual, Channel, Failure, Wisp, ScopeRef } from "#src/contracts";
import { awaitScopeConverged, park } from "#src/primitives-kit";
import { fork, receive, self, send, spawn } from "#src/syscalls";
import type { Either } from "#src/utils";
import { channel } from "#src/contracts/channel";
import { either } from "fp-ts";
import { narrowAs } from "#src/utils";
import { pipe } from "fp-ts/function";
import { wisp } from "#src/internal/fp";
import { supervisorScopeSpec } from "#src/scopes";

export function resource<ProvidedValue>(
  body: ResourceBody<ProvidedValue>,
): Wisp<Either<Failure, ProvidedValue>> {
  const resourceChannel = channel<Either<Failure, ProvidedValue>>();

  return pipe(
    wisp.Do,
    wisp.bindF("callerSelf", self),
    wisp.bindF("resourceSupervisorSelf", ({ callerSelf: { scopeRef: callerRef } }) =>
      spawn(resourceSupervisor(body, callerRef, resourceChannel), supervisorScopeSpec()),
    ),
    wisp.chainF(
      ({
        callerSelf: { scopeRef: callerRef },
        resourceSupervisorSelf: { scopeRef: supervisorRef },
      }) => fork(resourceFailureRelay(supervisorRef, callerRef, resourceChannel)),
    ),
    wisp.chainF(() => receive(resourceChannel)),
    wisp.map(({ value }) => value),
    wisp.map(narrowAs<Either<Failure, ProvidedValue>>()),
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
          wisp.liftF,
          wisp.chain(() => park()),
        ),
      ),
      wisp.chain(() => park()),
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
      wisp.chainF((value) => send(callerRef, resourceChannel, value)),
    );
}
