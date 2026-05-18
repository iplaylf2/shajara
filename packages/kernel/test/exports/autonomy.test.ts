import type {
  AutonomyOptions,
  Failure,
  FutureResult,
  FutureSettleKey,
  ProcessRef,
  Processor,
  ProcessorTaskStatus,
  Reaper,
  Ritual,
  Scheduler,
  Wisp,
} from "#/index";
import {
  all,
  autonomy,
  branch,
  cancel,
  canceledFailure,
  cede,
  defer,
  externalFailure,
  future,
  interruptedFailure,
  park,
  spawn,
  wait,
} from "#/index";
import {
  createInlineProcessor,
  createManagedExecutor,
  createQueuedProcessor,
  findFailureByKind,
  unwrapSome,
  waitForSettled,
} from "#test/harness";
import { describe, expect, test } from "vitest";
import { left, right, some } from "#/utils";
import { either } from "fp-ts";
import { pipe } from "fp-ts/function";
import { wisp } from "#/internal/fp";

describe("/ primitives: autonomy", () => {
  test.for([
    {
      given: ["autonomy-ready"] as const,
      outcome: {
        assignedCount: 0,
        settled: containedAutonomySuccess("autonomy-ready"),
        settledStatus: "closed",
        taskStatuses: ["exited"],
      },
    },
  ])(
    "runs autonomy inline when the autonomous ritual settles synchronously",
    async ({ given: [entryResult], outcome }) => {
      const taskStatuses: ProcessorTaskStatus[] = [];
      const assigned: ProcessRef<unknown>[] = [];
      const processor = createInlineProcessor(taskStatuses);
      const scheduler = trackAssignments(assigned, processor);

      await using managed = createManagedExecutor();
      const { executor } = managed;
      const handle = unwrapSome(
        executor.launch(executor.scope, () =>
          awaitAutonomy(() => wisp.of(entryResult), { scheduler }),
        ),
      );

      const actual = {
        assignedCount: assigned.length,
        settled: await waitForSettled(executor, handle),
        settledStatus: handle.status,
        taskStatuses,
      };

      expect(actual).toEqual(outcome);
    },
  );

  test.for([
    {
      given: ["autonomy-ready"] as const,
      outcome: {
        settled: right({
          hasProcessExitFuture: true,
          hasScopeExitFuture: true,
          outcome: right("autonomy-ready"),
        }),
        settledStatus: "closed",
      },
    },
  ])(
    "returns the branch handle for the autonomous scope",
    async ({ given: [entryResult], outcome }) => {
      const taskStatuses: ProcessorTaskStatus[] = [];
      const assigned: ProcessRef<unknown>[] = [];
      const processor = createInlineProcessor(taskStatuses);
      const scheduler = trackAssignments(assigned, processor);

      await using managed = createManagedExecutor();
      const { executor } = managed;
      const handle = unwrapSome(
        executor.launch(executor.scope, () =>
          pipe(
            autonomy(() => wisp.of(entryResult), { scheduler }),
            wisp.chain((branchHandle) =>
              pipe(
                wait(branchHandle.scope.exitFuture),
                wisp.map((settled) => ({
                  hasProcessExitFuture: branchHandle.process.exitFuture !== undefined,
                  hasScopeExitFuture: branchHandle.scope.exitFuture !== undefined,
                  outcome: settled,
                })),
              ),
            ),
          ),
        ),
      );

      const actual = {
        settled: await waitForSettled(executor, handle),
        settledStatus: handle.status,
      };

      expect(actual).toEqual(outcome);
    },
  );

  test.for([
    {
      given: ["autonomy-sibling", "ordinary-sibling"] as const,
      outcome: {
        assignedCount: 1,
        settled: right({
          autonomousExit: right("autonomy-sibling"),
          ordinaryExit: right("ordinary-sibling"),
        }),
        settledStatus: "closed",
        taskStatuses: ["ready", "cede", "exited"],
      },
    },
  ])(
    "keeps autonomous scheduler routing scoped to the autonomous branch",
    async ({ given: [autonomousResult, ordinaryResult], outcome }) => {
      const taskStatuses: ProcessorTaskStatus[] = [];
      const assigned: ProcessRef<unknown>[] = [];

      await using queued = createQueuedProcessor(taskStatuses);
      const scheduler = trackAssignments(assigned, queued.processor);

      await using managed = createManagedExecutor();
      const { executor } = managed;
      const handle = unwrapSome(
        executor.launch(executor.scope, () =>
          pipe(
            wisp.Do,
            wisp.bind("autonomous", () =>
              autonomy(
                () =>
                  pipe(
                    cede(),
                    wisp.chain(() => wisp.of(autonomousResult)),
                  ),
                { scheduler },
              ),
            ),
            wisp.bind("ordinary", () =>
              branch(() =>
                pipe(
                  cede(),
                  wisp.chain(() => wisp.of(ordinaryResult)),
                ),
              ),
            ),
            wisp.bind("autonomousExit", ({ autonomous }) => wait(autonomous.scope.exitFuture)),
            wisp.bind("ordinaryExit", ({ ordinary }) => wait(ordinary.scope.exitFuture)),
            wisp.map(({ autonomousExit, ordinaryExit }) => ({
              autonomousExit,
              ordinaryExit,
            })),
          ),
        ),
      );
      const settled = await waitForSettled(executor, handle);
      const actual = {
        assignedCount: assigned.length,
        settled,
        settledStatus: handle.status,
        taskStatuses,
      };

      expect(actual).toEqual(outcome);
    },
  );

  test.for([
    {
      given: [new Error("scheduler assignment failed"), "scheduler-entry"] as const,
      outcome: {
        settledStatus: "closed",
      },
    },
  ])(
    "cancels the autonomous scope when scheduler assignment throws out-of-band",
    async ({ given: [cause, entryResult], outcome }) => {
      const scheduler: Scheduler = {
        assign: () => {
          throw cause;
        },
      };

      await using managed = createManagedExecutor();
      const { executor } = managed;
      const handle = unwrapSome(
        executor.launch(executor.scope, () =>
          awaitAutonomy(() => wisp.of(entryResult), { scheduler }),
        ),
      );

      const actual = {
        settled: await waitForSettled(executor, handle),
        settledStatus: handle.status,
      };

      expect(actual.settledStatus).toBe(outcome.settledStatus);
      expect(unwrapContainedAutonomyFailure(actual.settled)).toEqual(canceledFailure());
    },
  );

  test.for([
    {
      given: {
        cause: new Error("scheduler assignment failed"),
        cleanup: "cleanup",
        settlementMaxTurns: 64,
      } as const,
      outcome: {
        assignedCount: 4,
        cleanupEvents: ["cleanup"] as const,
        scopeFailureCause: {
          kind: "external",
          message: "Scope did not finish closing within the executor reaper round limit",
          raw: {
            round: 32,
            roundLimit: 32,
          },
        },
        settledStatus: "closed",
      },
    },
  ])(
    "lets the reaper govern a canceled autonomous scope after deferred cleanup suspends",
    async ({ given, outcome }) => {
      const events: string[] = [];
      const processor = createInlineProcessor();
      const assigned: ProcessRef<unknown>[] = [];
      const scheduler: Scheduler = {
        assign: (process) => {
          assigned.push(process);
          if (assigned.length === 2) {
            throw given.cause;
          }

          return processor;
        },
      };

      await using managed = createManagedExecutor();
      const { executor } = managed;
      const handle = unwrapSome(
        executor.launch(executor.scope, () =>
          awaitAutonomy(
            () =>
              pipe(
                defer(() =>
                  pipe(
                    wisp.fromIO(() => {
                      events.push(given.cleanup);
                    }),
                    wisp.chain(park),
                  ),
                ),
                wisp.chain(() => spawn(() => wisp.of(undefined))),
              ),
            { scheduler },
          ),
        ),
      );
      const settled = await waitForSettled(executor, handle, {
        maxTurns: given.settlementMaxTurns,
      });
      const actual = {
        assignedCount: assigned.length,
        cleanupEvents: [...events] as readonly string[],
        settled,
        settledStatus: handle.status,
      };

      expect({
        assignedCount: actual.assignedCount,
        cleanupEvents: actual.cleanupEvents,
        settledStatus: actual.settledStatus,
      }).toEqual({
        assignedCount: outcome.assignedCount,
        cleanupEvents: outcome.cleanupEvents,
        settledStatus: outcome.settledStatus,
      });

      expect(unwrapContainedAutonomyFailure(actual.settled)).toEqual(
        expect.objectContaining({
          cause: outcome.scopeFailureCause,
          kind: "scope",
        }),
      );
    },
  );

  test.for([
    {
      given: ["autonomy-ready"] as const,
      outcome: {
        assignedAfterWait: 2,
        assignedBeforeWait: 2,
        settled: containedAutonomySuccess(right("autonomy-ready")),
        settledStatus: "closed",
        taskStatuses: ["ready", "ready", "ready", "waiting", "exited"],
      },
    },
  ])(
    "routes suspended autonomy through the provided inline scheduler",
    async ({ given: [entryResult], outcome }) => {
      const taskStatuses: ProcessorTaskStatus[] = [];
      const assigned: ProcessRef<unknown>[] = [];
      const processor = createInlineProcessor(taskStatuses);
      const scheduler = trackAssignments(assigned, processor);

      await using managed = createManagedExecutor();
      const { executor } = managed;
      const futureSettle = Promise.withResolvers<FutureSettleKey<string>>();
      const handle = unwrapSome(
        executor.launch(executor.scope, () =>
          awaitAutonomy(
            () =>
              pipe(
                future<string>(),
                wisp.chain(([futureKey, nextFutureSettle]) =>
                  pipe(
                    wisp.fromIO(() => {
                      futureSettle.resolve(nextFutureSettle);
                      return futureKey;
                    }),
                    wisp.chain(wait),
                  ),
                ),
              ),
            { scheduler },
          ),
        ),
      );
      executor.settle(await futureSettle.promise, right(entryResult));
      const assignedBeforeWait = assigned.length;
      const settled = await waitForSettled(executor, handle);
      const actual = {
        assignedAfterWait: assigned.length,
        assignedBeforeWait,
        settled,
        settledStatus: handle.status,
        taskStatuses,
      };

      expect(actual).toEqual(outcome);
    },
  );

  test.for([
    {
      given: ["autonomy-ready"] as const,
      outcome: {
        assignedAfterWait: 2,
        assignedBeforeWait: 2,
        settled: containedAutonomySuccess(right("autonomy-ready")),
        settledStatus: "closed",
        taskStatuses: ["ready", "ready", "ready", "waiting", "exited"],
      },
    },
  ])(
    "routes suspended autonomy through the provided queued scheduler",
    async ({ given: [entryResult], outcome }) => {
      const taskStatuses: ProcessorTaskStatus[] = [];
      const assigned: ProcessRef<unknown>[] = [];

      await using queued = createQueuedProcessor(taskStatuses);
      const scheduler = trackAssignments(assigned, queued.processor);

      await using managed = createManagedExecutor();
      const { executor } = managed;
      const futureSettle = Promise.withResolvers<FutureSettleKey<string>>();
      const handle = unwrapSome(
        executor.launch(executor.scope, () =>
          awaitAutonomy(
            () =>
              pipe(
                future<string>(),
                wisp.chain(([futureKey, nextFutureSettle]) =>
                  pipe(
                    wisp.fromIO(() => {
                      futureSettle.resolve(nextFutureSettle);
                      return futureKey;
                    }),
                    wisp.chain(wait),
                  ),
                ),
              ),
            { scheduler },
          ),
        ),
      );
      executor.settle(await futureSettle.promise, right(entryResult));
      const assignedBeforeWait = assigned.length;
      const settled = await waitForSettled(executor, handle);
      const actual = {
        assignedAfterWait: assigned.length,
        assignedBeforeWait,
        settled,
        settledStatus: handle.status,
        taskStatuses,
      };

      expect(actual).toEqual(outcome);
    },
  );

  test.for([
    {
      given: [
        ["alpha", "beta"] as const,
        ["alpha-before", "beta-before", "alpha-after", "beta-after"] as const,
        [right("alpha"), right("beta")] as const,
      ] as const,
      outcome: {
        assignedCount: 2,
        settled: containedAutonomySuccess([right("alpha"), right("beta")]),
        settledStatus: "closed",
        taskStatuses: ["ready", "cede", "ready", "cede", "exited", "exited"],
      },
    },
  ])(
    "routes ceded autonomous tasks through the shared queued scheduler in admission order",
    async ({ given: [labels, eventOrder, resultOrder], outcome }) => {
      const taskStatuses: ProcessorTaskStatus[] = [];
      const assigned: ProcessRef<unknown>[] = [];
      const events: string[] = [];

      await using queued = createQueuedProcessor(taskStatuses);
      const scheduler = trackAssignments(assigned, queued.processor);

      await using managed = createManagedExecutor();
      const { executor } = managed;
      const handle = unwrapSome(
        executor.launch(executor.scope, () =>
          pipe(
            all([
              () =>
                awaitAutonomy(
                  () =>
                    pipe(
                      wisp.fromIO(() => {
                        events.push(`${labels[0]}-before`);
                      }),
                      wisp.chain(() => cede()),
                      wisp.chain(() =>
                        wisp.fromIO(() => {
                          events.push(`${labels[0]}-after`);
                          return labels[0];
                        }),
                      ),
                    ),
                  { scheduler },
                ),
              () =>
                awaitAutonomy(
                  () =>
                    pipe(
                      wisp.fromIO(() => {
                        events.push(`${labels[1]}-before`);
                      }),
                      wisp.chain(() => cede()),
                      wisp.chain(() =>
                        wisp.fromIO(() => {
                          events.push(`${labels[1]}-after`);
                          return labels[1];
                        }),
                      ),
                    ),
                  { scheduler },
                ),
            ]),
            wisp.chain(wait),
          ),
        ),
      );
      const settled = await waitForSettled(executor, handle);

      const actual = {
        assignedCount: assigned.length,
        events,
        settled,
        settledStatus: handle.status,
        taskStatuses,
      };

      expect(actual).toEqual({
        ...outcome,
        events: [...eventOrder],
      });
      expect(assigned).toHaveLength(resultOrder.length);
    },
  );

  test.for([
    {
      given: [externalFailure("reaper-failure", "reaped autonomy scope")] as const,
      outcome: {
        adjudicationCount: 1,
        settled: containedAutonomyFailure(
          expect.objectContaining({
            cause: {
              kind: "external",
              message: "reaped autonomy scope",
              raw: "reaper-failure",
            },
            kind: "scope",
          }),
        ),
        settledStatus: "closed",
      },
    },
  ])(
    "applies the provided reaper when an autonomous scope remains stuck while closing",
    async ({ given: [failure], outcome }) => {
      const adjudicatedScopes: unknown[] = [];
      const reaper: Reaper = {
        adjudicate: (scope) => {
          adjudicatedScopes.push(scope);
          return wisp.of(some(failure));
        },
      };

      await using managed = createManagedExecutor();
      const { executor } = managed;
      const handle = unwrapSome(
        executor.launch(executor.scope, () =>
          awaitAutonomy(
            () =>
              pipe(
                defer(() => park()),
                wisp.chain(() => spawn(cancel)),
                wisp.chain(() => park()),
              ),
            { reaper },
          ),
        ),
      );
      const settled = await waitForSettled(executor, handle);

      const actual = {
        adjudicationCount: adjudicatedScopes.length,
        settled,
        settledStatus: handle.status,
      };

      expect(actual).toEqual(outcome);
    },
  );

  test.for([
    {
      given: [
        "autonomy-ready",
        externalFailure("composed-reaper", "reaped composed autonomy scope"),
      ] as const,
      outcome: {
        adjudicationCount: 1,
        assignedAfterSettle: 6,
        assignedBeforeSettle: 2,
        settled: containedAutonomyFailure(
          expect.objectContaining({
            cause: {
              kind: "external",
              message: "reaped composed autonomy scope",
              raw: "composed-reaper",
            },
            kind: "scope",
          }),
        ),
        settledStatus: "closed",
      },
    },
  ])(
    "composes scheduler and reaper governance within the same autonomous scope",
    async ({ given: [entryResult, failure], outcome }) => {
      const taskStatuses: ProcessorTaskStatus[] = [];
      const assigned: ProcessRef<unknown>[] = [];
      const futureSettle = Promise.withResolvers<FutureSettleKey<string>>();
      let adjudicationCount = 0;

      await using queued = createQueuedProcessor(taskStatuses);
      const scheduler = trackAssignments(assigned, queued.processor);
      const reaper: Reaper = {
        adjudicate: () => {
          adjudicationCount += 1;
          return wisp.of(some(failure));
        },
      };

      await using managed = createManagedExecutor();
      const { executor } = managed;
      const handle = unwrapSome(
        executor.launch(executor.scope, () =>
          awaitAutonomy(
            () =>
              pipe(
                future<string>(),
                wisp.chain(([futureKey, nextFutureSettle]) =>
                  pipe(
                    wisp.fromIO(() => {
                      futureSettle.resolve(nextFutureSettle);
                      return futureKey;
                    }),
                    wisp.chain(wait),
                    wisp.chain(() => wisp.of(entryResult)),
                    wisp.chain(() =>
                      pipe(
                        defer(() => park()),
                        wisp.chain(() => spawn(cancel)),
                        wisp.chain(() => park()),
                      ),
                    ),
                  ),
                ),
              ),
            { reaper, scheduler },
          ),
        ),
      );

      executor.settle(await futureSettle.promise, right(entryResult));
      const assignedBeforeSettle = assigned.length;
      const settled = await waitForSettled(executor, handle);

      const actual = {
        adjudicationCount,
        assignedAfterSettle: assigned.length,
        assignedBeforeSettle,
        settled,
        settledStatus: handle.status,
      };

      expect(actual).toEqual(outcome);
    },
  );

  test.for([
    {
      given: [externalFailure("inline-reaper", "reaped inline autonomy scope")] as const,
      outcome: {
        adjudicationCount: 1,
        settled: containedAutonomyFailure(
          expect.objectContaining({
            cause: {
              kind: "external",
              message: "reaped inline autonomy scope",
              raw: "inline-reaper",
            },
            kind: "scope",
          }),
        ),
        settledStatus: "closed",
      },
    },
  ])(
    "applies reaper results settled through an inline autonomous scheduler",
    async ({ given: [failure], outcome }) => {
      const scheduler = trackAssignments([], createInlineProcessor());
      let adjudicationCount = 0;
      const reaper: Reaper = {
        adjudicate: () => {
          adjudicationCount += 1;
          return wisp.of(some(failure));
        },
      };

      await using managed = createManagedExecutor();
      const { executor } = managed;
      const handle = unwrapSome(
        executor.launch(executor.scope, () =>
          awaitAutonomy(
            () =>
              pipe(
                defer(() => park()),
                wisp.chain(() => spawn(cancel)),
                wisp.chain(() => park()),
              ),
            { reaper, scheduler },
          ),
        ),
      );
      const settled = await waitForSettled(executor, handle);

      const actual = {
        adjudicationCount,
        settled,
        settledStatus: handle.status,
      };

      expect(actual).toEqual(outcome);
    },
  );

  test.for([
    {
      given: [new Error("reaper adjudication failed")] as const,
      outcome: {
        causeMessage: "reaper adjudication failed",
        settledStatus: "closed",
      },
    },
  ])(
    "interrupts the autonomous scope when reaper adjudication throws",
    async ({ given: [cause], outcome }) => {
      const reaper: Reaper = {
        adjudicate: () => {
          throw cause;
        },
      };

      await using managed = createManagedExecutor();
      const { executor } = managed;
      const handle = unwrapSome(
        executor.launch(executor.scope, () =>
          awaitAutonomy(
            () =>
              pipe(
                defer(() => park()),
                wisp.chain(() => spawn(cancel)),
                wisp.chain(() => park()),
              ),
            { reaper },
          ),
        ),
      );

      const actual = {
        settled: await waitForSettled(executor, handle),
        settledStatus: handle.status,
      };

      expect(actual.settledStatus).toBe(outcome.settledStatus);

      expect(
        findFailureByKind(unwrapContainedAutonomyFailure(actual.settled), "interrupted"),
      ).toEqual(
        expect.objectContaining(
          interruptedFailure(
            expect.objectContaining({
              message: outcome.causeMessage,
            }),
          ),
        ),
      );
    },
  );
});

function awaitAutonomy<Relic>(
  entry: Ritual<Relic>,
  options: AutonomyOptions,
): Wisp<FutureResult<Relic>> {
  return pipe(
    autonomy(entry, options),
    wisp.chain(({ scope }) => wait(scope.exitFuture)),
  );
}

function containedAutonomySuccess<Relic>(result: Relic): FutureResult<FutureResult<Relic>> {
  return right(right(result));
}

function containedAutonomyFailure(failure: Failure): FutureResult<FutureResult<unknown>> {
  return right(left(failure));
}

function unwrapContainedAutonomyFailure(result: FutureResult<FutureResult<unknown>>): Failure {
  if (either.isLeft(result) || either.isRight(result.right)) {
    throw new Error("Expected the launched scope to contain an autonomous scope failure", {
      cause: result,
    });
  }

  return result.right.left;
}

function trackAssignments(assigned: ProcessRef<unknown>[], processor: Processor): Scheduler {
  return {
    assign: (process) => {
      assigned.push(process);
      return processor;
    },
  };
}
