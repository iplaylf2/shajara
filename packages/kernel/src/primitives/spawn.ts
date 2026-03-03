import type { Blueprint, Failure, Plan, ScopeRef } from "#src/contracts";
import {
  awaitScopeConverged,
  resumableDelegateKey,
  resumableFailureChannel,
  resumableRecoveryChannel,
  spawnScope,
} from "#src/primitives-kit";
import { bind, fork, receive, self, send } from "#src/syscalls";
import { standardScopeSpec, supervisorScopeSpec } from "#src/scopes";
import type { Either } from "#src/utils";
import { either } from "fp-ts";
import { pipe } from "fp-ts/function";
import { plan } from "#src/internal/fp";

export function spawn<Return>(
  entry: Blueprint<Return>,
  options?: SpawnOptions,
): Plan<ScopeRef<Return>> {
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

export type SpawnRecoveryHandler = (failure: Failure) => Plan<Either<Failure, unknown>>;

function withRecoveryPoint<Return>(
  entry: Blueprint<Return>,
  recover: SpawnRecoveryHandler,
): Blueprint<Return> {
  return () =>
    pipe(
      fork(recoveryWorker(recover), { participation: "auxiliary" }),
      plan.liftF,
      plan.chain(() => entry()),
    );
}

function recoveryWorker(recover: SpawnRecoveryHandler): Blueprint<never> {
  function loop(): Plan<never> {
    return pipe(
      receive(resumableFailureChannel),
      plan.liftF,
      plan.chain(({ from, value: failure }) =>
        pipe(
          fork(recoveryAttempt(from, failure, recover)),
          plan.liftF,
          plan.chain(() => loop()),
        ),
      ),
    );
  }

  return () =>
    pipe(
      self(),
      plan.liftF,
      plan.chainF(({ scopeRef }) => bind(resumableDelegateKey, scopeRef)),
      plan.chain(() => loop()),
    );
}

function recoveryAttempt(
  from: ScopeRef<unknown>,
  failure: Failure,
  recover: SpawnRecoveryHandler,
): Blueprint<void> {
  return () =>
    pipe(
      spawnScope(() => recover(failure), supervisorScopeSpec()),
      plan.chain(awaitScopeConverged),
      plan.map(either.flatten),
      plan.chainF((recovery) => send(from, resumableRecoveryChannel, recovery)),
    );
}
