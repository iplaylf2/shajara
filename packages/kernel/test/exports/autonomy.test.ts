import type {
  Executor,
  FutureSettleKey,
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
import { iife, right, some } from "#/utils";
import { pipe } from "fp-ts/function";
import { wisp } from "#/internal/fp";

describe("/ primitives: autonomy", () => {
  test.for([
    {
      given: ["inline", "suspended", "autonomy-ready"] as const,
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
    {
      given: ["inline", "synchronous", "autonomy-ready"] as const,
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
    {
      given: ["queued", "suspended", "autonomy-ready"] as const,
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
    "routes autonomous scope processes through the provided scheduler",
    async ({ given: [processorKind, settlement, entryResult], outcome }) => {
      const taskStatuses: ProcessorTaskStatus[] = [];
      const assignedProcesses: ProcessRef<unknown>[] = [];
      const actual = await iife(async () => {
        switch (processorKind) {
          case "inline": {
            await using managed = createManagedExecutor();
            return await runSchedulerCase({
              assignedProcesses,
              entryResult,
              executor: managed.executor,
              processor: createInlineProcessor(taskStatuses),
              settlement,
              taskStatuses,
            });
          }
          case "queued": {
            await using queued = createManagedQueuedProcessor(taskStatuses);
            await using managed = createManagedExecutor();
            return await runSchedulerCase({
              assignedProcesses,
              entryResult,
              executor: managed.executor,
              processor: queued.processor,
              settlement,
              taskStatuses,
            });
          }
        }
      });

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

async function runSchedulerCase({
  executor,
  processor,
  settlement,
  entryResult,
  assignedProcesses,
  taskStatuses,
}: {
  executor: Executor;
  processor: Processor;
  settlement: SettlementMode;
  entryResult: string;
  assignedProcesses: ProcessRef<unknown>[];
  taskStatuses: ProcessorTaskStatus[];
}) {
  const scheduler: Scheduler = {
    assign: (process) => {
      assignedProcesses.push(process);
      return processor;
    },
  };
  const futureSettle =
    settlement === "suspended" ? Promise.withResolvers<FutureSettleKey<string>>() : null;
  if (futureSettle === null) {
    const handle = unwrapSome(
      executor.launch(executor.scope, () =>
        pipe(
          autonomy(() => wisp.of(entryResult), { scheduler }),
          wisp.chain(wait),
        ),
      ),
    );

    return {
      assignmentCount: assignedProcesses.length,
      settled: await waitForSettled(handle),
      settledStatus: handle.status,
      taskStatuses,
    };
  }

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

  {
    const capturedFutureSettle = await futureSettle.promise;
    executor.settle(capturedFutureSettle, right(entryResult));
  }

  return {
    assignmentCount: assignedProcesses.length,
    settled: await waitForSettled(handle),
    settledStatus: handle.status,
    taskStatuses,
  };
}

type SettlementMode = "suspended" | "synchronous";
