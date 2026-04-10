import type { FutureSettleKey, ProcessRef, ProcessorTaskStatus, Reaper, Scheduler } from "#/index";
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
      given: ["inline", "autonomy-ready"] as const,
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
      given: ["queued", "autonomy-ready"] as const,
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
    async ({ given: [processorMode, entryResult], outcome }) => {
      const taskStatuses: ProcessorTaskStatus[] = [];
      const assignedProcesses: ProcessRef<unknown>[] = [];
      const futureSettle = Promise.withResolvers<FutureSettleKey<string>>();
      await using managed = createManagedExecutor();

      if (processorMode === "queued") {
        await using queued = createManagedQueuedProcessor(taskStatuses);

        const actual = await runAutonomySchedulerScenario({
          assignedProcesses,
          entryResult,
          executor: managed.executor,
          futureSettle,
          schedulerProcessor: queued.processor,
          taskStatuses,
        });

        expect(actual).toEqual(outcome);
        return;
      }

      const actual = await runAutonomySchedulerScenario({
        assignedProcesses,
        entryResult,
        executor: managed.executor,
        futureSettle,
        schedulerProcessor: createInlineProcessor(taskStatuses),
        taskStatuses,
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

async function runAutonomySchedulerScenario({
  assignedProcesses,
  entryResult,
  executor,
  futureSettle,
  schedulerProcessor,
  taskStatuses,
}: SchedulerScenario) {
  const scheduler: Scheduler = {
    assign: (process) => {
      assignedProcesses.push(process);
      return schedulerProcessor;
    },
  };

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
  const capturedFutureSettle = await futureSettle.promise;
  executor.settle(capturedFutureSettle, right(entryResult));

  return {
    assignmentCount: assignedProcesses.length,
    settled: await waitForSettled(handle),
    settledStatus: handle.status,
    taskStatuses,
  };
}

interface SchedulerScenario {
  readonly assignedProcesses: ProcessRef<unknown>[];
  readonly entryResult: string;
  readonly executor: ReturnType<typeof createManagedExecutor>["executor"];
  readonly futureSettle: PromiseWithResolvers<FutureSettleKey<string>>;
  readonly schedulerProcessor: Scheduler["assign"] extends (...args: never[]) => infer Processor
    ? Processor
    : never;
  readonly taskStatuses: ProcessorTaskStatus[];
}
