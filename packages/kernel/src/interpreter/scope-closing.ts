import type { FailureShape, Ritual } from "#src/contracts";
import type { HaltHandler, RuntimeScope } from "./runtime-scope";
import { all, enclose, spawn, wait } from "#src/primitives";
import { either, option, readonlyArray } from "fp-ts";
import { flow, pipe } from "fp-ts/function";
import type { RuntimeProcess } from "./runtime-process";
import type { ScopeFailureBuilder } from "./scope-failure-builder";
import { scopeTerminated } from "#src/failures";
import { wisp } from "#src/internal/fp";

const EMPTY_CHILD_CLOSINGS = 0;

export function unwindScopeClosing(
  closing: ScopeClosing,
  scopeFailure: ScopeFailureBuilder,
  haltHandler: HaltHandler,
): Ritual<FailureShape> {
  return () =>
    pipe(
      pipe(
        closing.children,
        option.fromPredicate((children) => children.length > EMPTY_CHILD_CLOSINGS),
        option.match(
          () => wisp.of(null),
          flow(
            readonlyArray.map(
              (child) =>
                (() =>
                  enclose(
                    unwindTerminatedScopeClosing(child, scopeFailure, haltHandler),
                  )) as ChildClosingBranch,
            ),
            all,
            wisp.chain(wait),
            wisp.map(() => null),
          ),
        ),
      ),
      wisp.chain(() => spawn(haltHandler(closing.scope, closing.processes, scopeFailure.cause))),
      wisp.chain(wait),
      wisp.map((result) => {
        pipe(
          result,
          option.fromPredicate(either.isRight),
          option.map(({ right }) => scopeFailure.addClosingFailure(right)),
        );

        return scopeFailure.build();
      }),
    );
}

export interface ScopeClosing {
  readonly children: readonly ScopeClosing[];
  readonly processes: readonly RuntimeProcess[];
  readonly scope: RuntimeScope;
}

function unwindTerminatedScopeClosing(
  closing: ScopeClosing,
  scopeFailure: ScopeFailureBuilder,
  haltHandler: HaltHandler,
): Ritual<FailureShape> {
  return () =>
    pipe(
      pipe(
        closing.children,
        option.fromPredicate((children) => children.length > EMPTY_CHILD_CLOSINGS),
        option.match(
          () => wisp.of(null),
          flow(
            readonlyArray.map(
              (child) =>
                (() =>
                  enclose(
                    unwindTerminatedScopeClosing(child, scopeFailure, haltHandler),
                  )) as ChildClosingBranch,
            ),
            all,
            wisp.chain(wait),
            wisp.map(() => null),
          ),
        ),
      ),
      wisp.chain(() => spawn(haltHandler(closing.scope, closing.processes, scopeTerminated()))),
      wisp.chain(wait),
      wisp.map((result) => {
        pipe(
          result,
          option.fromPredicate(either.isRight),
          option.map(({ right }) => scopeFailure.addClosingFailure(right)),
        );

        return scopeTerminated();
      }),
    );
}

type ChildClosingResult = either.Either<FailureShape, FailureShape>;
type ChildClosingBranch = Ritual<ChildClosingResult>;
