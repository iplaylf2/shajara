import type { FailureShape, FutureKey, Ritual } from "#src/contracts";
import type { HaltHandler, RuntimeScope } from "./runtime-scope";
import { spawn, wait } from "#src/primitives";
import type { Failure } from "#src/failures";
import type { RuntimeProcess } from "./runtime-process";
import type { ScopeFailureBuilder } from "./scope-failure-builder";
import { isLeft } from "#src/utils";
import { pipe } from "fp-ts/function";
import { readonlyArray } from "fp-ts";
import { scopeTerminated } from "#src/failures";
import { wisp } from "#src/internal/fp";

export function unwindScopeClosing(
  closing: ScopeClosing,
  scopeFailure: ScopeFailureBuilder,
  haltHandler: HaltHandler,
): Ritual<FailureShape> {
  return () =>
    pipe(
      spawnHaltedChildren(closing.children, scopeFailure, haltHandler),
      wisp.chain(waitForChildren),
      wisp.chain(() => {
        const cause = haltedCause(scopeFailure);

        return spawn(runHaltHandler(closing.scope, closing.processes, cause, haltHandler));
      }),
      wisp.chain(wait),
      wisp.map((result) => {
        const cause = haltedCause(scopeFailure);

        scopeFailure.recordHaltHandlerResult(result);

        return scopeFailure.complete(cause);
      }),
    );
}

export interface ScopeClosing {
  readonly children: readonly ScopeClosing[];
  readonly processes: readonly RuntimeProcess[];
  readonly scope: RuntimeScope;
}

function spawnHaltedChildren(
  children: readonly ScopeClosing[],
  scopeFailure: ScopeFailureBuilder,
  haltHandler: HaltHandler,
) {
  return pipe(
    children,
    readonlyArray.map((child) =>
      spawn(unwindTerminatedScopeClosing(child, scopeFailure, haltHandler)),
    ),
    wisp.sequence,
  );
}

function waitForChildren(childFutures: readonly FutureKey<FailureShape>[]) {
  return pipe(childFutures, readonlyArray.map(wait), wisp.sequence);
}

function runHaltHandler(
  scope: RuntimeScope,
  processes: readonly RuntimeProcess[],
  failure: Failure,
  haltHandler: HaltHandler,
): Ritual<Failure> {
  return haltHandler(scope, processes, failure);
}

function unwindTerminatedScopeClosing(
  closing: ScopeClosing,
  scopeFailure: ScopeFailureBuilder,
  haltHandler: HaltHandler,
): Ritual<FailureShape> {
  return () =>
    pipe(
      spawnTerminatedChildren(closing.children, scopeFailure, haltHandler),
      wisp.chain(waitForChildren),
      wisp.chain(() =>
        spawn(runHaltHandler(closing.scope, closing.processes, scopeTerminated(), haltHandler)),
      ),
      wisp.chain(wait),
      wisp.map((result) => {
        scopeFailure.recordHaltHandlerResult(result);

        return scopeFailure.complete(scopeTerminated());
      }),
    );
}

function spawnTerminatedChildren(
  children: readonly ScopeClosing[],
  scopeFailure: ScopeFailureBuilder,
  haltHandler: HaltHandler,
) {
  return pipe(
    children,
    readonlyArray.map((child) =>
      spawn(unwindTerminatedScopeClosing(child, scopeFailure, haltHandler)),
    ),
    wisp.sequence,
  );
}

function haltedCause(scopeFailure: ScopeFailureBuilder): Failure {
  const { result } = scopeFailure.causeProcess;

  if (result && isLeft(result)) {
    return result.left as Failure;
  }

  return scopeFailure.cause;
}
