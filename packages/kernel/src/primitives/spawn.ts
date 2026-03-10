import type { Failure, Ritual, ScopeRef, ScopeSpec, Wisp } from "#src/contracts";
import {
  awaitFuture,
  bind,
  fork,
  receive,
  self,
  settleFuture,
  spawn as spawnSigil,
} from "#src/sigils";
import { resumableDelegateKey, resumableFailureMessageKey } from "#src/primitives-kit";
import { standardScopeSpec, supervisorScopeSpec } from "#src/scopes";
import type { Either } from "#src/utils";
import type { ResumableRecoveryRequest } from "#src/primitives-kit";
import { either } from "fp-ts";
import { pipe } from "fp-ts/function";
import { wisp } from "#src/internal/fp";

export function spawn<Relic>(entry: Ritual<Relic>, options?: SpawnOptions): Wisp<ScopeRef<Relic>> {
  if (options?.mode === "supervisor") {
    return spawnScope(entry, supervisorScopeSpec());
  }

  if (options?.mode === "recovery") {
    return spawnScope(withRecoveryPoint(entry, options.recover), standardScopeSpec());
  }

  return spawnScope(entry, standardScopeSpec());
}

export type SpawnOptions = SpawnSupervisorOption | SpawnRecoveryOption;

export interface SpawnSupervisorOption {
  readonly mode: "supervisor";
}

export interface SpawnRecoveryOption {
  readonly mode: "recovery";
  readonly recover: SpawnRecoveryHandler;
}

export type SpawnRecoveryHandler = (failure: Failure) => Wisp<Either<Failure, unknown>>;

function spawnScope<Relic>(entry: Ritual<Relic>, spec: ScopeSpec): Wisp<ScopeRef<Relic>> {
  return pipe(
    spawnSigil(entry, spec),
    wisp.liftF,
    wisp.map(({ scopeRef }) => scopeRef),
  );
}

function withRecoveryPoint<Relic>(
  entry: Ritual<Relic>,
  recover: SpawnRecoveryHandler,
): Ritual<Relic> {
  return () =>
    pipe(
      fork(recoveryWorker(recover), { participation: "auxiliary" }),
      wisp.liftF,
      wisp.chain(() => entry()),
    );
}

function recoveryWorker(recover: SpawnRecoveryHandler): Ritual<never> {
  function loop(): Wisp<never> {
    return pipe(
      receive(resumableFailureMessageKey),
      wisp.liftF,
      wisp.chain((value) =>
        pipe(
          fork(recoveryAttempt(value, recover)),
          wisp.liftF,
          wisp.chain(() => loop()),
        ),
      ),
    );
  }

  return () =>
    pipe(
      self(),
      wisp.liftF,
      wisp.chainF(({ scopeRef }) => bind(resumableDelegateKey, scopeRef)),
      wisp.chain(() => loop()),
    );
}

function recoveryAttempt(
  request: ResumableRecoveryRequest<unknown>,
  recover: SpawnRecoveryHandler,
): Ritual<void> {
  return () =>
    pipe(
      spawnScope(() => recover(request.failure), supervisorScopeSpec()),
      wisp.chainF((scopeRef) => awaitFuture(scopeRef.exitFuture)),
      wisp.map(either.flatten),
      wisp.chainF((recovery) => settleFuture(request.recoveryKey, recovery)),
    );
}
