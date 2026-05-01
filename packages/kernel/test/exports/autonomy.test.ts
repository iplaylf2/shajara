import type {
  AutonomyOptions,
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
  cancel,
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
import { right, some } from "#/utils";
import { pipe } from "fp-ts/function";
import { wisp } from "#/internal/fp";

describe("/ primitives: autonomy", () => {
  test.for([
    {
      given: ["autonomy-ready"] as const,
      outcome: {
        assignedCount: 0,
        settled: {
          kind: "success",
          result: right("autonomy-ready"),
        },
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
        settled: await waitForSettled(handle),
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
        settled: {
          kind: "success",
          result: {
            hasProcessExitFuture: true,
            hasScopeExitFuture: true,
            outcome: right("autonomy-ready"),
          },
        },
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
        settled: await waitForSettled(handle),
        settledStatus: handle.status,
      };

      expect(actual).toEqual(outcome);
    },
  );

  test.for([
    {
      given: [new Error("scheduler assignment failed"), "scheduler-entry"] as const,
      outcome: {
        causeMessage: "scheduler assignment failed",
        settledKind: "failure",
        settledStatus: "closed",
      },
    },
  ])(
    "interrupts the autonomous scope when scheduler assignment throws out-of-band",
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
        settled: await waitForSettled(handle),
        settledStatus: handle.status,
      };

      expect({
        settledKind: actual.settled.kind,
        settledStatus: actual.settledStatus,
      }).toEqual({
        settledKind: outcome.settledKind,
        settledStatus: outcome.settledStatus,
      });
      if (actual.settled.kind !== "failure") {
        throw new Error("Expected autonomy settlement to fail");
      }

      expect(findFailureByKind(actual.settled.failure, "interrupted")).toEqual(
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

  test.for([
    {
      given: ["autonomy-ready"] as const,
      outcome: {
        assignedAfterWait: 2,
        assignedBeforeWait: 2,
        settled: {
          kind: "success",
          result: right(right("autonomy-ready")),
        },
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
      const settled = await waitForSettled(handle);
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
        settled: {
          kind: "success",
          result: right(right("autonomy-ready")),
        },
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
      const settled = await waitForSettled(handle);
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
        settled: {
          kind: "success",
          result: right([right("alpha"), right("beta")]),
        },
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
      const settled = await waitForSettled(handle);

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
        settled: {
          failure: expect.objectContaining({
            cause: expect.objectContaining({
              failure: expect.objectContaining({
                cause: expect.objectContaining({
                  failure: {
                    kind: "external",
                    message: "reaped autonomy scope",
                    raw: "reaper-failure",
                  },
                }),
                kind: "scope",
              }),
              kind: "scope",
            }),
            kind: "scope",
          }),
          kind: "failure",
        },
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
      const settled = await waitForSettled(handle);

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
        settled: {
          failure: expect.objectContaining({
            cause: expect.objectContaining({
              failure: expect.objectContaining({
                cause: expect.objectContaining({
                  failure: {
                    kind: "external",
                    message: "reaped composed autonomy scope",
                    raw: "composed-reaper",
                  },
                }),
                kind: "scope",
              }),
              kind: "scope",
            }),
            kind: "scope",
          }),
          kind: "failure",
        },
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
      const settled = await waitForSettled(handle);

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
      given: [new Error("reaper adjudication failed")] as const,
      outcome: {
        causeMessage: "reaper adjudication failed",
        settledKind: "failure",
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
        settled: await waitForSettled(handle),
        settledStatus: handle.status,
      };

      expect({
        settledKind: actual.settled.kind,
        settledStatus: actual.settledStatus,
      }).toEqual({
        settledKind: outcome.settledKind,
        settledStatus: outcome.settledStatus,
      });
      if (actual.settled.kind !== "failure") {
        throw new Error("Expected autonomy settlement to fail");
      }

      expect(findFailureByKind(actual.settled.failure, "interrupted")).toEqual(
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

function trackAssignments(assigned: ProcessRef<unknown>[], processor: Processor): Scheduler {
  return {
    assign: (process) => {
      assigned.push(process);
      return processor;
    },
  };
}
