import type {
  FutureSettleKey,
  ProcessRef,
  Processor,
  ProcessorTaskStatus,
  Reaper,
  Scheduler,
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
  createManagedQueuedProcessor,
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
        assignmentCount: 0,
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
      const assignedProcesses: ProcessRef<unknown>[] = [];
      const processor = createInlineProcessor(taskStatuses);
      const scheduler = createTrackingScheduler(assignedProcesses, processor);

      await using managed = createManagedExecutor();
      const { executor } = managed;
      const handle = unwrapSome(
        executor.launch(executor.scope, () =>
          pipe(
            autonomy(() => wisp.of(entryResult), { scheduler }),
            wisp.chain(wait),
          ),
        ),
      );

      const actual = {
        assignmentCount: assignedProcesses.length,
        settled: await waitForSettled(handle),
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
        interruptedCauseMessage: "scheduler assignment failed",
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
          pipe(
            autonomy(() => wisp.of(entryResult), { scheduler }),
            wisp.chain(wait),
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
              message: outcome.interruptedCauseMessage,
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
        assignmentsAfterWait: 2,
        assignmentsBeforeWait: 1,
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
      const assignedProcesses: ProcessRef<unknown>[] = [];
      const processor = createInlineProcessor(taskStatuses);
      const scheduler = createTrackingScheduler(assignedProcesses, processor);

      await using managed = createManagedExecutor();
      const { executor } = managed;
      const futureSettle = Promise.withResolvers<FutureSettleKey<string>>();
      const handle = unwrapSome(
        executor.launch(executor.scope, () =>
          pipe(
            autonomy(
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
            wisp.chain(wait),
          ),
        ),
      );
      executor.settle(await futureSettle.promise, right(entryResult));
      const assignmentsBeforeWait = assignedProcesses.length;
      const settled = await waitForSettled(handle);
      const actual = {
        assignmentsAfterWait: assignedProcesses.length,
        assignmentsBeforeWait,
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
        assignmentsAfterWait: 2,
        assignmentsBeforeWait: 1,
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
      const assignedProcesses: ProcessRef<unknown>[] = [];

      await using queued = createManagedQueuedProcessor(taskStatuses);
      const scheduler = createTrackingScheduler(assignedProcesses, queued.processor);

      await using managed = createManagedExecutor();
      const { executor } = managed;
      const futureSettle = Promise.withResolvers<FutureSettleKey<string>>();
      const handle = unwrapSome(
        executor.launch(executor.scope, () =>
          pipe(
            autonomy(
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
            wisp.chain(wait),
          ),
        ),
      );
      executor.settle(await futureSettle.promise, right(entryResult));
      const assignmentsBeforeWait = assignedProcesses.length;
      const settled = await waitForSettled(handle);
      const actual = {
        assignmentsAfterWait: assignedProcesses.length,
        assignmentsBeforeWait,
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
        assignmentCount: 2,
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
      const assignedProcesses: ProcessRef<unknown>[] = [];
      const events: string[] = [];

      await using queued = createManagedQueuedProcessor(taskStatuses);
      const scheduler = createTrackingScheduler(assignedProcesses, queued.processor);

      await using managed = createManagedExecutor();
      const { executor } = managed;
      const handle = unwrapSome(
        executor.launch(executor.scope, () =>
          pipe(
            all([
              () =>
                pipe(
                  autonomy(
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
                  wisp.chain(wait),
                ),
              () =>
                pipe(
                  autonomy(
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
                  wisp.chain(wait),
                ),
            ]),
            wisp.chain(wait),
          ),
        ),
      );
      const settled = await waitForSettled(handle);

      const actual = {
        assignmentCount: assignedProcesses.length,
        events,
        settled,
        settledStatus: handle.status,
        taskStatuses,
      };

      expect(actual).toEqual({
        ...outcome,
        events: [...eventOrder],
      });
      expect(assignedProcesses).toHaveLength(resultOrder.length);
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
          pipe(
            autonomy(
              () =>
                pipe(
                  defer(() => park()),
                  wisp.chain(() => spawn(cancel)),
                  wisp.chain(() => park()),
                ),
              { reaper },
            ),
            wisp.chain(wait),
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
        assignmentsAfterSettle: 6,
        assignmentsBeforeSettle: 1,
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
      const assignedProcesses: ProcessRef<unknown>[] = [];
      const futureSettle = Promise.withResolvers<FutureSettleKey<string>>();
      let adjudicationCount = 0;

      await using queued = createManagedQueuedProcessor(taskStatuses);
      const scheduler = createTrackingScheduler(assignedProcesses, queued.processor);
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
          pipe(
            autonomy(
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
            wisp.chain(wait),
          ),
        ),
      );

      executor.settle(await futureSettle.promise, right(entryResult));
      const assignmentsBeforeSettle = assignedProcesses.length;
      const settled = await waitForSettled(handle);

      const actual = {
        adjudicationCount,
        assignmentsAfterSettle: assignedProcesses.length,
        assignmentsBeforeSettle,
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
        interruptedCauseMessage: "reaper adjudication failed",
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
          pipe(
            autonomy(
              () =>
                pipe(
                  defer(() => park()),
                  wisp.chain(() => spawn(cancel)),
                  wisp.chain(() => park()),
                ),
              { reaper },
            ),
            wisp.chain(wait),
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
              message: outcome.interruptedCauseMessage,
            }),
          ),
        ),
      );
    },
  );
});

function createTrackingScheduler(
  assignedProcesses: ProcessRef<unknown>[],
  processor: Processor,
): Scheduler {
  return {
    assign: (process) => {
      assignedProcesses.push(process);
      return processor;
    },
  };
}
