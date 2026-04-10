import { createManagedExecutor, unwrapSome, waitForSettled } from "#test/harness";
import { describe, expect, test } from "vitest";
import { future, park, wait } from "#/index";
import { isSome, right } from "#/utils";
import type { FutureSettleKey } from "#/index";
import { pipe } from "fp-ts/function";
import { wisp } from "#/internal/fp";

describe("/ exports: createExecutor", () => {
  test.for([
    {
      given: [] as const,
      outcome: {
        rootScopeCreated: true,
        status: "open",
      },
    },
  ])("creates an executor instance with an open root handle", async ({ outcome }) => {
    await using managed = createManagedExecutor();
    const { executor } = managed;

    const actual = {
      rootScopeCreated: executor.scope !== undefined,
      status: executor.status,
    };

    expect(actual).toEqual(outcome);
  });

  test.for([
    {
      given: [] as const,
      outcome: {
        kind: "canceled",
      },
    },
  ])("exposes root settlement through the executor handle itself", async ({ outcome }) => {
    await using managed = createManagedExecutor();
    const { executor } = managed;

    const settled = waitForSettled(executor);
    executor.cancel(executor.scope);

    expect(await settled).toEqual(outcome);
  });

  test.for([
    {
      given: ["entry-done"] as const,
      outcome: {
        initialStatus: "open",
        launchedUnderRoot: true,
        settled: {
          kind: "success",
          result: "entry-done",
        },
        settledStatus: "closed",
      },
    },
  ])(
    "creates an execution environment whose root scope can launch a ritual",
    async ({ given: [entryResult], outcome }) => {
      await using managed = createManagedExecutor();
      const { executor } = managed;

      const handle = unwrapSome(executor.launch(executor.scope, () => wisp.of(entryResult)));
      const actual = {
        initialStatus: handle.status,
        launchedUnderRoot: handle.scope !== executor.scope,
        settled: await waitForSettled(handle),
        settledStatus: handle.status,
      };

      expect(actual).toEqual(outcome);
    },
  );
});

describe("/ exports: Executor", () => {
  test.for([
    {
      given: [] as const,
      outcome: {
        canceled: true,
        launchAfterClose: false,
        settled: {
          kind: "canceled",
        },
      },
    },
  ])("launch returns none once the target execution scope has closed", async ({ outcome }) => {
    await using managed = createManagedExecutor();
    const { executor } = managed;

    const handle = unwrapSome(executor.launch(executor.scope, () => park()));
    const actual = {
      canceled: executor.cancel(handle.scope),
      launchAfterClose: isSome(executor.launch(handle.scope, () => wisp.of("should-not-launch"))),
      settled: await waitForSettled(handle),
    };

    expect(actual).toEqual(outcome);
  });

  test.for([
    {
      given: ["future-ready"] as const,
      outcome: {
        firstSettle: true,
        secondSettle: false,
        settled: {
          kind: "success",
          result: right("future-ready"),
        },
        settledStatus: "closed",
      },
    },
  ])(
    "settle injects a future result into the launched execution environment",
    async ({ given: [value], outcome }) => {
      await using managed = createManagedExecutor();
      const { executor } = managed;
      const futureSettle = Promise.withResolvers<FutureSettleKey<string>>();

      const handle = unwrapSome(
        executor.launch(executor.scope, () =>
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
        ),
      );
      const capturedFutureSettle = await futureSettle.promise;

      const actual = {
        firstSettle: executor.settle(capturedFutureSettle, right(value)),
        secondSettle: executor.settle(capturedFutureSettle, right(value)),
        settled: await waitForSettled(handle),
        settledStatus: handle.status,
      };

      expect(actual).toEqual(outcome);
    },
  );

  test.for([
    {
      given: [] as const,
      outcome: {
        firstCancel: true,
        secondCancel: false,
        settled: {
          kind: "canceled",
        },
        settledStatus: "closed",
      },
    },
  ])(
    "cancel terminates an open launched scope and becomes idempotent after closure",
    async ({ outcome }) => {
      await using managed = createManagedExecutor();
      const { executor } = managed;

      const handle = unwrapSome(executor.launch(executor.scope, () => park()));
      const actual = {
        firstCancel: executor.cancel(handle.scope),
        secondCancel: executor.cancel(handle.scope),
        settled: await waitForSettled(handle),
        settledStatus: handle.status,
      };

      expect(actual).toEqual(outcome);
    },
  );
});

describe("/ exports: LaunchHandle", () => {
  test.for([
    {
      given: ["entry-done"] as const,
      outcome: {
        scopeCreated: true,
        statusAfterSettle: "closed",
      },
    },
  ])(
    "exposes a launched scope and reports closed status after settlement",
    async ({ given: [entryResult], outcome }) => {
      await using managed = createManagedExecutor();
      const { executor } = managed;

      const handle = unwrapSome(executor.launch(executor.scope, () => wisp.of(entryResult)));
      await waitForSettled(handle);

      const actual = {
        scopeCreated: handle.scope !== executor.scope,
        statusAfterSettle: handle.status,
      };

      expect(actual).toEqual(outcome);
    },
  );
});
