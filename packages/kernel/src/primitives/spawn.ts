import type { Failure, Ritual, ScopeRef, ScopeSpec, Wisp } from "#src/contracts";
import { bind, fork, receive, self, settle, spawn as spawnSigil, wait } from "#src/sigils";
import { resumableDelegateKey, resumableFailureKey } from "#src/primitives-kit";
import { standardScopeSpec, supervisorScopeSpec } from "#src/scopes";
import type { Either } from "#src/utils";
import type { ResumableRecoveryRequest } from "#src/primitives-kit";
import { either } from "fp-ts";
import { pipe } from "fp-ts/function";
import { unreachable } from "#src/utils";
import { wisp } from "#src/internal/fp";

export function spawn<Relic>(
  entry: Ritual<Relic>,
  options: SpawnOptions = { mode: "standard" },
): Wisp<ScopeRef<Relic>> {
  switch (options.mode) {
    case "standard":
      return spawnScope(entry, standardScopeSpec());
    case "supervisor":
      return spawnScope(entry, supervisorScopeSpec());
    case "recovery":
      return spawnScope(withRecoveryPoint(entry, options.recover), standardScopeSpec());
    default:
      return unreachable();
  }
}

export type SpawnOptions = SpawnStandardOption | SpawnSupervisorOption | SpawnRecoveryOption;

export interface SpawnStandardOption {
  readonly mode: "standard";
}

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
      receive(resumableFailureKey),
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
      wisp.chainF((scopeRef) => wait(scopeRef.exitFuture)),
      wisp.map(either.flatten),
      wisp.chainF((recovery) => settle(request.recoverySettle, recovery)),
    );
}
