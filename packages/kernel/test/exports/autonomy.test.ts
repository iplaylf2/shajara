import type {
  Executor,
  FutureSettleKey,
  LaunchHandle,
  ProcessRef,
  Processor,
  ProcessorTaskStatus,
  Reaper,
  Scheduler,
} from "#/index";
import { autonomy, cancel, defer, externalFailure, future, park, spawn, wait } from "#/index";
import {
  createInlineProcessor,
  createManagedExecutor,
  createManagedQueuedProcessor,
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
      given: ["autonomy-ready"] as const,
      outcome: {
        assignmentCount: 2,
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
      const actual = await settleSuspendedAutonomy(
        executor,
        futureSettle,
        handle,
        entryResult,
        assignedProcesses,
        taskStatuses,
      );

      expect(actual).toEqual(outcome);
    },
  );

  test.for([
    {
      given: ["autonomy-ready"] as const,
      outcome: {
        assignmentCount: 2,
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
      const actual = await settleSuspendedAutonomy(
        executor,
        futureSettle,
        handle,
        entryResult,
        assignedProcesses,
        taskStatuses,
      );

      expect(actual).toEqual(outcome);
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

async function settleSuspendedAutonomy(
  executor: Executor,
  futureSettle: PromiseWithResolvers<FutureSettleKey<string>>,
  handle: LaunchHandle<unknown>,
  entryResult: string,
  assignedProcesses: ProcessRef<unknown>[],
  taskStatuses: ProcessorTaskStatus[],
) {
  executor.settle(await futureSettle.promise, right(entryResult));

  return {
    assignmentCount: assignedProcesses.length,
    settled: await waitForSettled(handle),
    settledStatus: handle.status,
    taskStatuses,
  };
}
