import type { ScopeFailure, ScopeRef, ScopedOutcome } from "#/index";
import { cede, guard, halt, resumable, self, wait } from "#/index";
import {
  createManagedExecutor,
  interpretRitual,
  interpretWithRecovery,
  unwrapExitedSucceeded,
  unwrapSome,
  waitForSettled,
} from "#test/harness";
import { describe, expect, test } from "vitest";
import { left, none, noop, right, some } from "#/utils";
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

      await using ritual = interpretWithRecovery(() =>
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

      await using ritual = interpretWithRecovery(() =>
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
      await using ritual = interpretWithRecovery(() =>
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
          scopeFailureOf({
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
        "unreachable guarded result",
        left({
          kind: "halted",
          message: "unreachable recovery result",
        }),
      ] as const,
      outcome: {
        processExit: left(missingAnchor("recovery-point")),
        scopeExit: left(scopeFailureOf(missingAnchor("recovery-point"))),
      },
    },
  ])(
    "guard branches fail when they run outside an executor recovery anchor",
    async ({ given: [entryResult, recoveryResult], outcome }) => {
      await using ritual = interpretRitual(() =>
        guard(
          () => wisp.of(entryResult),
          () => wisp.of(some(recoveryResult)),
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
        handle: null as ScopedOutcome<string> | null,
      };

      await using ritual = interpretWithRecovery(() =>
        guard(
          () =>
            pipe(
              resumable(() => wisp.of(ready)),
              wisp.chain((handle) =>
                wisp.fromIO(() => {
                  captured.handle = handle;
                }),
              ),
            ),
          () => wisp.of(some(right(unexpected))),
        ),
      );
      const step = ritual.driveSync();
      const guardHandle = unwrapExitedSucceeded(step);
      assertCaptured(captured.handle);
      const [, resumableFuture] = captured.handle;
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
        failure: null as ScopeFailure | null,
        handle: null as ScopedOutcome<string> | null,
      };

      await using ritual = interpretWithRecovery(() =>
        guard(
          () =>
            pipe(
              resumable<string>(() => halt(entryFailure)),
              wisp.chain((handle) =>
                wisp.fromIO(() => {
                  captured.handle = handle;
                }),
              ),
            ),
          (caught) =>
            pipe(
              wisp.fromIO(() => {
                captured.failure = caught;
              }),
              wisp.chain(() => wisp.of(some(recoveryResult))),
            ),
        ),
      );
      const step = ritual.driveSync();
      const guardHandle = unwrapExitedSucceeded(step);
      assertCaptured(captured.failure);
      assertCaptured(captured.handle);
      const [, resumableFuture] = captured.handle;
      const actual = {
        caught: right(captured.failure),
        guardExit: await ritual.waitForFuture(guardHandle.scope.exitFuture),
        resumableResult: await ritual.waitForFuture(resumableFuture),
      };

      expect(actual.resumableResult).toEqual(outcome.resumableResult);
      expect(actual.caught).toEqual(
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
        handle: null as ScopedOutcome<string> | null,
        inner: null as ScopeFailure | null,
        outer: null as ScopeFailure | null,
      };

      await using ritual = interpretWithRecovery(() =>
        guard(
          () =>
            pipe(
              guard(
                () =>
                  pipe(
                    resumable<string>(() => halt(entryFailure)),
                    wisp.chain((handle) =>
                      wisp.fromIO(() => {
                        captured.handle = handle;
                      }),
                    ),
                  ),
                (caught) =>
                  pipe(
                    wisp.fromIO(() => {
                      captured.inner = caught;
                    }),
                    wisp.chain(() => wisp.of(outcome.innerRecovery)),
                  ),
              ),
              wisp.map(noop),
            ),
          (caught) =>
            pipe(
              wisp.fromIO(() => {
                captured.outer = caught;
              }),
              wisp.chain(() => wisp.of(some(outerRecovery))),
            ),
        ),
      );
      ritual.driveSync();
      assertCaptured(captured.handle);
      const [, resumableFuture] = captured.handle;

      expect(await ritual.waitForFuture(resumableFuture)).toEqual(outcome.resumableResult);
      assertCaptured(captured.inner);
      assertCaptured(captured.outer);
      expect(captured.inner).toEqual(captured.outer);
    },
  );
});

function scopeFailureOf(failure: unknown): ScopeFailure {
  return expect.objectContaining({
    cause: expect.objectContaining({
      failure,
    }),
    kind: "scope",
  }) as ScopeFailure;
}

function missingAnchor(site: "recovery-point" | "recovery-request") {
  return expect.objectContaining({
    cause: expect.objectContaining({
      reason: "missing-recovery-anchor",
      site,
    }),
    kind: "interrupted",
  });
}

function assertCaptured<Captured>(value: Captured | null): asserts value is NonNullable<Captured> {
  if (value === null) {
    throw new Error("Expected test ritual to capture a value");
  }
}
