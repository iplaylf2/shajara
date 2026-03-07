import type { Ritual, Failure, Wisp, ScopeRef } from "#src/contracts";
import {
  awaitScopeConverged,
  resumableDelegateKey,
  resumableFailureChannel,
  resumableRecoveryChannel,
  spawnScope,
} from "#src/primitives-kit";
import { bind, fork, receive, self, send } from "#src/sigils";
import { standardScopeSpec, supervisorScopeSpec } from "#src/scopes";
import type { Either } from "#src/utils";
import { either } from "fp-ts";
import { pipe } from "fp-ts/function";
import { wisp } from "#src/internal/fp";

export function spawn<Return>(
  entry: Ritual<Return>,
  options?: SpawnOptions,
): Wisp<ScopeRef<Return>> {
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

function withRecoveryPoint<Return>(
  entry: Ritual<Return>,
  recover: SpawnRecoveryHandler,
): Ritual<Return> {
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
      receive(resumableFailureChannel),
      wisp.liftF,
      wisp.chain(({ from, value: failure }) =>
        pipe(
          fork(recoveryAttempt(from, failure, recover)),
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
  from: ScopeRef<unknown>,
  failure: Failure,
  recover: SpawnRecoveryHandler,
): Ritual<void> {
  return () =>
    pipe(
      spawnScope(() => recover(failure), supervisorScopeSpec()),
      wisp.chain(awaitScopeConverged),
      wisp.map(either.flatten),
      wisp.chainF((recovery) => send(from, resumableRecoveryChannel, recovery)),
    );
}
