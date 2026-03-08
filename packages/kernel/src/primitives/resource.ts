import type { Failure, MessageKey, Ritual, ScopeRef, Wisp } from "#src/contracts";
import { awaitScopeConverged, park } from "#src/primitives-kit";
import { fork, receive, self, send, spawn } from "#src/sigils";
import type { Either } from "#src/utils";
import { either } from "fp-ts";
import { messageKey } from "#src/contracts/message-key";
import { narrowAs } from "#src/utils";
import { pipe } from "fp-ts/function";
import { supervisorScopeSpec } from "#src/scopes";
import { wisp } from "#src/internal/fp";

export function resource<ProvidedValue>(
  body: ResourceBody<ProvidedValue>,
): Wisp<Either<Failure, ProvidedValue>> {
  const resourceMessageKey = messageKey<Either<Failure, ProvidedValue>>();

  return pipe(
    wisp.Do,
    wisp.bindF("callerSelf", self),
    wisp.bindF("resourceSupervisorSelf", ({ callerSelf: { scopeRef: callerRef } }) =>
      spawn(resourceSupervisor(body, callerRef, resourceMessageKey), supervisorScopeSpec()),
    ),
    wisp.chainF(
      ({
        callerSelf: { scopeRef: callerRef },
        resourceSupervisorSelf: { scopeRef: supervisorRef },
      }) => fork(resourceFailureRelay(supervisorRef, callerRef, resourceMessageKey)),
    ),
    wisp.chainF(() => receive(resourceMessageKey)),
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
  resourceMessageKey: MessageKey<Either<Failure, ProvidedValue>>,
): Ritual<never> {
  return () =>
    pipe(
      body((value) =>
        pipe(
          send(callerRef, resourceMessageKey, either.right(value)),
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
  resourceMessageKey: MessageKey<Either<Failure, ProvidedValue>>,
): Ritual<void> {
  return () =>
    pipe(
      supervisorRef,
      awaitScopeConverged,
      wisp.chainF((value) => send(callerRef, resourceMessageKey, value)),
    );
}
