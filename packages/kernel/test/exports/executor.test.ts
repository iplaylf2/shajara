import type { ExecutionScopeRef, FutureSettleKey } from "#/index";
import { createManagedExecutor, unwrapSome, waitForSettled } from "#test/harness";
import { describe, expect, test } from "vitest";
import { future, halt, park, settle, wait } from "#/index";
import { isSome, left, right } from "#/utils";
import { pipe } from "fp-ts/function";
import { wisp } from "#/internal/fp";

describe("/ helpers: createExecutor", () => {
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
        callbackSettled: {
          kind: "canceled",
        },
        settled: {
          kind: "canceled",
        },
        statusAfterSettle: "closed",
      },
    },
  ])("exposes root settlement through the executor handle itself", async ({ outcome }) => {
    await using managed = createManagedExecutor();
    const { executor } = managed;

    const settledPromise = waitForSettled(executor);
    executor.cancel(executor.scope);
    const settled = await settledPromise;

    let callbackSettled = null;
    executor.onSettled((result) => {
      callbackSettled = result;
    });

    const actual = {
      callbackSettled,
      settled,
      statusAfterSettle: executor.status,
    };

    expect(actual).toEqual(outcome);
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

describe("/ interfaces: Executor", () => {
  describe("launch-handle: scope, status, onSettled", () => {
    test.for([
      {
        given: ["entry-done"] as const,
        outcome: {
          callbackSettled: {
            kind: "success",
            result: "entry-done",
          },
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

        let callbackSettled = null;
        handle.onSettled((result) => {
          callbackSettled = result;
        });

        const actual = {
          callbackSettled,
          scopeCreated: handle.scope !== executor.scope,
          statusAfterSettle: handle.status,
        };

        expect(actual).toEqual(outcome);
      },
    );

    test.for([
      {
        given: [
          {
            kind: "halted",
            message: "launch-failed",
          },
        ] as const,
        outcome: {
          failure: expect.objectContaining({
            cause: expect.objectContaining({
              failure: {
                kind: "halted",
                message: "launch-failed",
              },
            }),
          }),
          kind: "failure",
        },
      },
    ])(
      "reports entry failures through the handle settlement channel",
      async ({ given: [failure], outcome }) => {
        await using managed = createManagedExecutor();
        const { executor } = managed;

        const handle = unwrapSome(executor.launch(executor.scope, () => halt(failure)));
        const actual = await waitForSettled(handle);

        expect(actual).toEqual(outcome);
      },
    );
  });

  describe("/: launch, settle, cancel", () => {
    test.for([
      {
        given: ["should-not-launch"] as const,
        outcome: {
          canceled: true,
          launchAfterClose: false,
          settled: {
            kind: "canceled",
          },
        },
      },
    ])(
      "launch returns none once the target execution scope has closed",
      async ({ given: [entryResult], outcome }) => {
        await using managed = createManagedExecutor();
        const { executor } = managed;

        const handle = unwrapSome(executor.launch(executor.scope, () => park()));
        const actual = {
          canceled: executor.cancel(handle.scope),
          launchAfterClose: isSome(executor.launch(handle.scope, () => wisp.of(entryResult))),
          settled: await waitForSettled(handle),
        };

        expect(actual).toEqual(outcome);
      },
    );

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
        given: [
          {
            kind: "halted",
            message: "future-failed",
          },
        ] as const,
        outcome: {
          injected: true,
          settled: {
            kind: "success",
            result: left({
              kind: "halted",
              message: "future-failed",
            }),
          },
          settledStatus: "closed",
        },
      },
    ])(
      "settle preserves injected future failures inside the launched result channel",
      async ({ given: [failure], outcome }) => {
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
          injected: executor.settle(capturedFutureSettle, left(failure)),
          settled: await waitForSettled(handle),
          settledStatus: handle.status,
        };

        expect(actual).toEqual(outcome);
      },
    );

    test.for([
      {
        given: ["future-ready", "too-late"] as const,
        outcome: {
          lateSettleAccepted: false,
          settled: {
            kind: "success",
            result: right("future-ready"),
          },
          settledStatus: "closed",
        },
      },
    ])(
      "settle returns false once the target future has already been completed",
      async ({ given: [value, lateValue], outcome }) => {
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
                  }),
                  wisp.chain(() => settle(nextFutureSettle, right(value))),
                  wisp.chain(() => wait(futureKey)),
                ),
              ),
            ),
          ),
        );
        const capturedFutureSettle = await futureSettle.promise;
        const settled = await waitForSettled(handle);

        const actual = {
          lateSettleAccepted: executor.settle(capturedFutureSettle, right(lateValue)),
          settled,
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

    test.for([
      {
        given: [{}, "unexpected"] as const,
        outcome: {
          cancelAccepted: false,
          launchAccepted: false,
        },
      },
    ])(
      "rejects launch and cancel requests for scopes that were not created by this executor",
      async ({ given: [foreignScope, entryResult], outcome }) => {
        await using managed = createManagedExecutor();
        const { executor } = managed;

        const actual = {
          cancelAccepted: executor.cancel(foreignScope as ExecutionScopeRef<never>),
          launchAccepted: isSome(
            executor.launch(foreignScope as ExecutionScopeRef<never>, () => wisp.of(entryResult)),
          ),
        };

        expect(actual).toEqual(outcome);
      },
    );

    test.for([
      {
        given: ["late-launch"] as const,
        outcome: {
          cancelAfterClose: false,
          launchAfterClose: false,
          rootCancel: true,
          settled: {
            kind: "canceled",
          },
          settledStatus: "closed",
        },
      },
    ])(
      "stops accepting root-scope launch and cancel requests after the executor closes",
      async ({ given: [entryResult], outcome }) => {
        await using managed = createManagedExecutor();
        const { executor } = managed;
        const rootCancel = executor.cancel(executor.scope);
        const launchAfterClose = isSome(
          executor.launch(executor.scope, () => wisp.of(entryResult)),
        );
        const cancelAfterClose = executor.cancel(executor.scope);

        const actual = {
          cancelAfterClose,
          launchAfterClose,
          rootCancel,
          settled: await waitForSettled(executor),
          settledStatus: executor.status,
        };

        expect(actual).toEqual(outcome);
      },
    );
  });
});
