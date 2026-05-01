import type { FailureShape, Ritual, ScopeFailure, ScopeRef, ScopedOutcome } from "#/index";
import { cede, guard, halt, resumable, self, wait } from "#/index";
import {
  createManagedExecutor,
  interpretRitual,
  unwrapExited,
  unwrapExitedSucceeded,
  unwrapSome,
  waitForSettled,
} from "#test/harness";
import { describe, expect, test } from "vitest";
import { left, none, noop, right, some } from "#/utils";
import { requestRecovery, withRecoveryAnchor, withRecoveryPoint } from "#/primitives-kit";
import { pipe } from "fp-ts/function";
import { wisp } from "#/internal/fp";

describe("/ primitives: guard, resumable", () => {
  test.for([
    {
      given: ["entry scope result"] as const,
      outcome: {
        result: right("entry scope result"),
        sameScope: true,
      },
    },
  ])(
    "resumable runs its entry in the returned scope",
    async ({ given: [entryResult], outcome }) => {
      const captured = {
        entryScope: null as ScopeRef<string> | null,
      };

      await using ritual = interpretRitualWithRecoveryAnchor(() =>
        pipe(
          resumable(() =>
            pipe(
              self(),
              wisp.chain(({ scope }) =>
                wisp.fromIO(() => {
                  captured.entryScope = scope as ScopeRef<string>;

                  return entryResult;
                }),
              ),
            ),
          ),
          wisp.chain(([scope, resultFuture]) =>
            pipe(
              wait(resultFuture),
              wisp.map((result) => ({
                result,
                sameScope: scope === captured.entryScope,
              })),
            ),
          ),
        ),
      );
      const step = await ritual.waitForClosed();
      const actual = unwrapExitedSucceeded(step);

      expect(actual).toEqual(outcome);
    },
  );

  test.for([
    {
      given: ["returned", "settled", "resumable result"] as const,
      outcome: {
        afterReturn: ["returned"] as const,
        finalEvents: ["returned", "settled"] as const,
        result: right("resumable result"),
      },
    },
  ])(
    "resumable returns before its entry scope settles",
    async ({ given: [returned, settled, entryResult], outcome }) => {
      const events: string[] = [];

      await using ritual = interpretRitualWithRecoveryAnchor(() =>
        pipe(
          resumable(() =>
            pipe(
              cede(),
              wisp.chain(() =>
                wisp.fromIO(() => {
                  events.push(settled);

                  return entryResult;
                }),
              ),
            ),
          ),
          wisp.chain((handle) =>
            wisp.fromIO(() => {
              events.push(returned);

              return handle;
            }),
          ),
        ),
      );
      const step = ritual.driveSync();
      const [, outcomeFuture] = unwrapExitedSucceeded(step);
      const afterReturn = [...events] as readonly string[];
      const result = await ritual.waitForFuture(outcomeFuture);
      const actual = {
        afterReturn,
        finalEvents: [...events] as readonly string[],
        result,
      };

      expect(actual).toEqual(outcome);
    },
  );

  test.for([
    {
      given: ["guarded result", "unused recovery"] as const,
      outcome: {
        processExit: right("guarded result"),
        scopeExit: right("guarded result"),
      },
    },
  ])(
    "guard preserves the guarded entry result",
    async ({ given: [entryResult, unusedRecovery], outcome }) => {
      await using ritual = interpretRitualWithRecoveryAnchor(() =>
        guard(
          () => wisp.of(entryResult),
          () => wisp.of(some(right(unusedRecovery))),
        ),
      );
      const step = ritual.driveSync();
      const handle = unwrapExitedSucceeded(step);
      const actual = {
        processExit: await ritual.waitForFuture(handle.process.exitFuture),
        scopeExit: await ritual.waitForFuture(handle.scope.exitFuture),
      };

      expect(actual).toEqual(outcome);
    },
  );

  test.for([
    {
      given: [
        {
          kind: "halted",
          message: "halted under executor root",
        },
      ] as const,
      outcome: {
        kind: "success",
        result: right(
          scopeFailureCausedBy({
            kind: "halted",
            message: "halted under executor root",
          }),
        ),
      },
    },
  ])(
    "executor recovery anchor wraps unguarded resumable failures as successful values",
    async ({ given: [failure], outcome }) => {
      await using managed = createManagedExecutor();
      const { executor } = managed;
      const handle = unwrapSome(
        executor.launch(executor.scope, () =>
          pipe(
            resumable<ScopeFailure>(() => halt(failure)),
            wisp.chain(([, resumableFuture]) => wait(resumableFuture)),
          ),
        ),
      );
      const actual = await waitForSettled(handle);

      expect(actual).toEqual(outcome);
    },
  );

  test.for([
    {
      given: [
        withRecoveryPoint<unknown>(
          () => wisp.of("unreachable"),
          () => wisp.of(none),
        ),
      ] as const,
      outcome: missingRecoveryAnchorFailure("recovery-point"),
    },
    {
      given: [
        () =>
          requestRecovery(
            scopeFailureFixture({
              kind: "halted",
              message: "unhandled recovery request",
            }),
          ),
      ] as const,
      outcome: missingRecoveryAnchorFailure("recovery-request"),
    },
  ])(
    "halts recovery points and requests that run outside an executor anchor",
    async ({ given: [entry], outcome }) => {
      await using ritual = interpretRitual(entry);
      const step = ritual.driveSync();
      const actual = unwrapExited(step);

      expect(actual).toEqual(outcome);
    },
  );

  test.for([
    {
      given: ["ready", "unexpected-recovery"] as const,
      outcome: {
        guardExit: right(undefined),
        resumableResult: right("ready"),
      },
    },
  ])(
    "resumable returns its entry result when it runs inside the guarded entry scope",
    async ({ given: [ready, unexpected], outcome }) => {
      const captured = {
        resumableHandle: null as ScopedOutcome<string> | null,
      };

      await using ritual = interpretRitualWithRecoveryAnchor(() =>
        guard(
          () =>
            pipe(
              resumable(() => wisp.of(ready)),
              wisp.chain((capturedHandle) =>
                wisp.fromIO(() => {
                  captured.resumableHandle = capturedHandle;
                }),
              ),
            ),
          () => wisp.of(some(right(unexpected))),
        ),
      );
      const step = ritual.driveSync();
      const guardHandle = unwrapExitedSucceeded(step);
      assertCaptured(captured.resumableHandle);
      const [, resumableFuture] = captured.resumableHandle;
      const actual = {
        guardExit: await ritual.waitForFuture(guardHandle.scope.exitFuture),
        resumableResult: await ritual.waitForFuture(resumableFuture),
      };

      expect(actual).toEqual(outcome);
    },
  );

  test.for([
    {
      given: [
        {
          kind: "halted",
          message: "halted for test",
        },
        right("recovered:halted"),
      ] as const,
      outcome: {
        guardExit: right(undefined),
        resumableResult: right("recovered:halted"),
      },
    },
    {
      given: [
        {
          kind: "halted",
          message: "halted for rejected recovery",
        },
        left({
          kind: "halted",
          message: "recovery refused",
        }),
      ] as const,
      outcome: {
        guardExit: right(undefined),
        resumableResult: left({
          kind: "halted",
          message: "recovery refused",
        }),
      },
    },
  ])(
    "guard receives resumable failures as scope failures and applies the recovery result",
    async ({ given: [entryFailure, recoveryResult], outcome }) => {
      const captured = {
        caughtFailure: null as ScopeFailure | null,
        resumableHandle: null as ScopedOutcome<string> | null,
      };

      await using ritual = interpretRitualWithRecoveryAnchor(() =>
        guard(
          () =>
            pipe(
              resumable<string>(() => halt(entryFailure)),
              wisp.chain((capturedHandle) =>
                wisp.fromIO(() => {
                  captured.resumableHandle = capturedHandle;
                }),
              ),
            ),
          (caught) =>
            pipe(
              wisp.fromIO(() => {
                captured.caughtFailure = caught;
              }),
              wisp.chain(() => wisp.of(some(recoveryResult))),
            ),
        ),
      );
      const step = ritual.driveSync();
      const guardHandle = unwrapExitedSucceeded(step);
      assertCaptured(captured.caughtFailure);
      assertCaptured(captured.resumableHandle);
      const [, resumableFuture] = captured.resumableHandle;
      const actual = {
        caughtFailure: right(captured.caughtFailure),
        guardExit: await ritual.waitForFuture(guardHandle.scope.exitFuture),
        resumableResult: await ritual.waitForFuture(resumableFuture),
      };

      expect(actual.resumableResult).toEqual(outcome.resumableResult);
      expect(actual.caughtFailure).toEqual(
        right(
          expect.objectContaining({
            cause: expect.objectContaining({
              failure: entryFailure,
            }),
            kind: "scope",
          }),
        ),
      );
      expect(actual.guardExit).toEqual(outcome.guardExit);
    },
  );

  test.for([
    {
      given: [
        {
          kind: "halted",
          message: "delegated recovery",
        },
        right("outer recovered"),
      ] as const,
      outcome: {
        innerRecovery: none,
        outerRecovery: right("outer recovered"),
        resumableResult: right("outer recovered"),
      },
    },
  ])(
    "guard delegates recovery to an ancestor when its handler returns none",
    async ({ given: [entryFailure, outerRecovery], outcome }) => {
      const captured = {
        innerCaughtFailure: null as ScopeFailure | null,
        outerCaughtFailure: null as ScopeFailure | null,
        resumableHandle: null as ScopedOutcome<string> | null,
      };

      await using ritual = interpretRitualWithRecoveryAnchor(() =>
        guard(
          () =>
            pipe(
              guard(
                () =>
                  pipe(
                    resumable<string>(() => halt(entryFailure)),
                    wisp.chain((capturedHandle) =>
                      wisp.fromIO(() => {
                        captured.resumableHandle = capturedHandle;
                      }),
                    ),
                  ),
                (caught) =>
                  pipe(
                    wisp.fromIO(() => {
                      captured.innerCaughtFailure = caught;
                    }),
                    wisp.chain(() => wisp.of(outcome.innerRecovery)),
                  ),
              ),
              wisp.map(noop),
            ),
          (caught) =>
            pipe(
              wisp.fromIO(() => {
                captured.outerCaughtFailure = caught;
              }),
              wisp.chain(() => wisp.of(some(outerRecovery))),
            ),
        ),
      );
      ritual.driveSync();
      assertCaptured(captured.resumableHandle);
      const [, resumableFuture] = captured.resumableHandle;

      expect(await ritual.waitForFuture(resumableFuture)).toEqual(outcome.resumableResult);
      assertCaptured(captured.innerCaughtFailure);
      assertCaptured(captured.outerCaughtFailure);
      expect(captured.innerCaughtFailure).toEqual(captured.outerCaughtFailure);
    },
  );
});

function scopeFailureCausedBy(failure: unknown): ScopeFailure {
  return expect.objectContaining({
    cause: expect.objectContaining({
      failure,
    }),
    kind: "scope",
  }) as ScopeFailure;
}

function scopeFailureFixture(failure: FailureShape): ScopeFailure {
  return {
    cause: {
      failure,
      kind: "process",
      process: null as never,
    },
    kind: "scope",
    message: "Scope failed during closing",
    suppressed: [],
  };
}

function missingRecoveryAnchorFailure(site: "recovery-point" | "recovery-request") {
  return left(
    expect.objectContaining({
      cause: expect.objectContaining({
        reason: "missing-recovery-anchor",
        site,
      }),
      kind: "interrupted",
    }),
  );
}

function interpretRitualWithRecoveryAnchor<Relic>(ritual: Ritual<Relic>) {
  return interpretRitual(withRecoveryAnchor(ritual));
}

function assertCaptured<Captured>(value: Captured | null): asserts value is NonNullable<Captured> {
  if (value === null) {
    throw new Error("Expected test ritual to capture a value");
  }
}
