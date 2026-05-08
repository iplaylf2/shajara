import type {
  ChannelSender,
  ExecutionScopeRef,
  Executor,
  FutureResult,
  FutureSettleKey,
  LaunchHandle,
  ReceiveResult,
} from "#/index";
import {
  cancel,
  canceledFailure,
  channel,
  currentExecutorKey,
  defer,
  externalFailure,
  future,
  halt,
  lookup,
  park,
  receive,
  settle,
  spawn,
  wait,
} from "#/index";
import { createManagedExecutor, unwrapSome, waitForSettled } from "#test/harness";
import { describe, expect, test } from "vitest";
import { isSome, left, right, some } from "#/utils";
import { either } from "fp-ts";
import { pipe } from "fp-ts/function";
import { wisp } from "#/internal/fp";

describe("/ helpers: createExecutor", () => {
  test.for([
    {
      given: [] as const,
      outcome: {
        found: true,
        sameExecutor: true,
      },
    },
  ])("provides the current executor through root context lookup", async ({ outcome }) => {
    await using managed = createManagedExecutor();
    const { executor } = managed;

    const handle = unwrapSome(executor.launch(executor.scope, () => lookup(currentExecutorKey)));
    const settled = await waitForSettled(executor, handle);
    const actual = {
      found: either.isRight(settled) && isSome(settled.right),
      sameExecutor:
        either.isRight(settled) && isSome(settled.right) && settled.right.value === executor,
    };

    expect(actual).toEqual(outcome);
  });

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
        futureSettled: left(canceledFailure),
        futureSettledAfterClose: left(canceledFailure),
        settled: left(canceledFailure),
        statusAfterSettle: "closed",
      },
    },
  ])("exposes root settlement through executor settlement observation", async ({ outcome }) => {
    await using managed = createManagedExecutor();
    const { executor } = managed;

    const futureSettled = Promise.withResolvers<unknown>();
    executor.onSettled(executor.scope.exitFuture, (result) => {
      futureSettled.resolve(result);
    });
    const settledPromise = waitForSettled(executor, executor);
    executor.cancel(executor.scope);
    const [futureSettledResult, settled] = await Promise.all([
      futureSettled.promise,
      settledPromise,
    ]);
    let futureSettledAfterClose = null;
    executor.onSettled(executor.scope.exitFuture, (result) => {
      futureSettledAfterClose = result;
    });

    const actual = {
      futureSettled: futureSettledResult,
      futureSettledAfterClose,
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
        settled: right("entry-done"),
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
        settled: await waitForSettled(executor, handle),
        settledStatus: handle.status,
      };

      expect(actual).toEqual(outcome);
    },
  );
});

describe("/ interfaces: Executor", () => {
  describe("launch-handle: scope, status", () => {
    test.for([
      {
        given: ["entry-done"] as const,
        outcome: {
          futureSettled: right("entry-done"),
          launchSettled: right("entry-done"),
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
        const launchSettled = await waitForSettled(executor, handle);
        let futureSettled = null;
        executor.onSettled(handle.scope.exitFuture, (result) => {
          futureSettled = result;
        });

        const actual = {
          futureSettled,
          launchSettled,
          scopeCreated: handle.scope !== executor.scope,
          statusAfterSettle: handle.status,
        };

        expect(actual).toEqual(outcome);
      },
    );

    test.for([
      {
        given: [externalFailure("halted", "launch-failed")] as const,
        outcome: left(
          expect.objectContaining({
            cause: externalFailure("halted", "launch-failed"),
          }),
        ),
      },
    ])(
      "reports entry failures through the launched scope exit future",
      async ({ given: [failure], outcome }) => {
        await using managed = createManagedExecutor();
        const { executor } = managed;

        const handle = unwrapSome(executor.launch(executor.scope, () => halt(failure)));
        const actual = await waitForSettled(executor, handle);

        expect(actual).toEqual(outcome);
      },
    );

    test.for([
      {
        given: [] as const,
        outcome: {
          firstSettled: left(canceledFailure),
          secondSettled: left(canceledFailure),
          settledStatus: "closed",
          turnFaults: [],
        },
      },
    ])(
      "resolves multiple settlement listeners when a launched scope settles",
      async ({ outcome }) => {
        await using managed = createManagedExecutor();
        const { executor } = managed;

        const handle = unwrapSome(executor.launch(executor.scope, () => park()));
        const first = waitForSettled(executor, handle);
        const second = waitForSettled(executor, handle);
        executor.cancel(handle.scope);
        const [firstSettled, secondSettled] = await Promise.all([first, second]);

        const actual = {
          firstSettled,
          secondSettled,
          settledStatus: handle.status,
          turnFaults: managed.turnFaults,
        };

        expect(actual).toEqual(outcome);
      },
    );

    test.for([
      {
        given: ["listener-threw", "throws", "records"] as const,
        outcome: {
          cancelError: expect.objectContaining({ message: "listener-threw" }),
          listenerCalls: ["throws", "records"],
          settled: left(canceledFailure),
          settledStatus: "closed",
          turnFaults: [],
        },
      },
    ])(
      "surfaces settlement listener exceptions through the synchronous cancel call",
      async ({ given: [causeMessage, throwingEntry, recordingEntry], outcome }) => {
        await using managed = createManagedExecutor();
        const { executor } = managed;

        const handle = unwrapSome(executor.launch(executor.scope, () => park()));
        const listenerCalls: string[] = [];
        executor.onSettled(handle.scope.exitFuture, () => {
          listenerCalls.push(throwingEntry);
          throw new Error(causeMessage);
        });
        executor.onSettled(handle.scope.exitFuture, () => {
          listenerCalls.push(recordingEntry);
        });

        let cancelError: unknown = null;
        try {
          executor.cancel(handle.scope);
        } catch (error) {
          cancelError = error;
        }

        const actual = {
          cancelError,
          listenerCalls,
          settled: await waitForSettled(executor, handle),
          settledStatus: handle.status,
          turnFaults: managed.turnFaults,
        };

        expect(actual).toEqual(outcome);
      },
    );

    test.for([
      {
        given: ["disposed", "active"] as const,
        outcome: {
          listenerCalls: ["active"],
          settled: left(canceledFailure),
        },
      },
    ])(
      "disposes a settlement listener before the launched scope settles",
      async ({ given: [disposed, active], outcome }) => {
        await using managed = createManagedExecutor();
        const { executor } = managed;

        const handle = unwrapSome(executor.launch(executor.scope, () => park()));
        const listenerCalls: string[] = [];
        const unsubscribe = executor.onSettled(handle.scope.exitFuture, () => {
          listenerCalls.push(disposed);
        });
        executor.onSettled(handle.scope.exitFuture, () => {
          listenerCalls.push(active);
        });
        unsubscribe();

        executor.cancel(handle.scope);
        const settled = await waitForSettled(executor, handle);

        const actual = {
          listenerCalls,
          settled,
        };

        expect(actual).toEqual(outcome);
      },
    );
  });

  describe("/: launch, settle, cancel", () => {
    test.for([
      {
        given: ["should-not-launch"] as const,
        outcome: {
          launchAfterClose: false,
          settled: left(canceledFailure),
        },
      },
    ])(
      "launch returns none once the target execution scope has closed",
      async ({ given: [entryResult], outcome }) => {
        await using managed = createManagedExecutor();
        const { executor } = managed;

        const handle = unwrapSome(executor.launch(executor.scope, () => park()));
        executor.cancel(handle.scope);
        const actual = {
          launchAfterClose: isSome(executor.launch(handle.scope, () => wisp.of(entryResult))),
          settled: await waitForSettled(executor, handle),
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
          settled: launchedResult(right("future-ready")),
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
        const settleKey = await futureSettle.promise;

        const actual = {
          firstSettle: executor.settle(settleKey, right(value)),
          secondSettle: executor.settle(settleKey, right(value)),
          settled: await waitForSettled(executor, handle),
          settledStatus: handle.status,
        };

        expect(actual).toEqual(outcome);
      },
    );

    test.for([
      {
        given: ["external-value"] as const,
        outcome: {
          sendResult: some({ kind: "sent" }),
          settled: right({ kind: "value", value: "external-value" }),
          settledStatus: "closed",
        },
      },
    ])(
      "trySend injects a channel value into the launched execution environment",
      async ({ given: [value], outcome }) => {
        await using managed = createManagedExecutor();
        const { executor } = managed;
        const { handle, sender } = await launchReceiver(executor);

        const actual = {
          sendResult: executor.trySend(sender, value),
          settled: await waitForSettled(executor, handle),
          settledStatus: handle.status,
        };

        expect(actual).toEqual(outcome);
      },
    );

    test.for([
      {
        given: ["closed-outcome", "late-value"] as const,
        outcome: {
          lateSendResult: some({ kind: "closed", outcome: "closed-outcome" }),
          settled: right({ kind: "closed", outcome: "closed-outcome" }),
          settledStatus: "closed",
        },
      },
    ])(
      "close injects a terminal channel result into the launched execution environment",
      async ({ given: [closeOutcome, lateValue], outcome }) => {
        await using managed = createManagedExecutor();
        const { executor } = managed;
        const { handle, sender } = await launchReceiver(executor);

        executor.close(sender, closeOutcome);
        const actual = {
          lateSendResult: executor.trySend(sender, lateValue),
          settled: await waitForSettled(executor, handle),
          settledStatus: handle.status,
        };

        expect(actual).toEqual(outcome);
      },
    );

    test.for([
      {
        given: [externalFailure("halted", "future-failed")] as const,
        outcome: {
          injected: true,
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
        const settleKey = await futureSettle.promise;

        const actual = {
          injected: executor.settle(settleKey, left(failure)),
          settled: await waitForSettled(executor, handle),
          settledStatus: handle.status,
        };

        expect(actual).toEqual({
          ...outcome,
          settled: launchedResult(left(failure)),
        });
      },
    );

    test.for([
      {
        given: ["future-ready", "too-late"] as const,
        outcome: {
          lateSettleAccepted: false,
          settled: launchedResult(right("future-ready")),
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
        const settleKey = await futureSettle.promise;
        const settled = await waitForSettled(executor, handle);

        const actual = {
          lateSettleAccepted: executor.settle(settleKey, right(lateValue)),
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
          settled: left(canceledFailure),
          settledStatus: "closed",
        },
      },
    ])(
      "cancel terminates an open launched scope and becomes idempotent after closure",
      async ({ outcome }) => {
        await using managed = createManagedExecutor();
        const { executor } = managed;

        const handle = unwrapSome(executor.launch(executor.scope, () => park()));
        executor.cancel(handle.scope);
        executor.cancel(handle.scope);
        const actual = {
          settled: await waitForSettled(executor, handle),
          settledStatus: handle.status,
        };

        expect(actual).toEqual(outcome);
      },
    );

    test.for([
      {
        given: [{}, "unexpected"] as const,
        outcome: {
          launchAccepted: false,
        },
      },
    ])(
      "rejects launch requests and ignores cancel requests for scopes outside this executor",
      async ({ given: [foreignScope, entryResult], outcome }) => {
        await using managed = createManagedExecutor();
        const { executor } = managed;

        executor.cancel(foreignScope as ExecutionScopeRef<never>);
        const actual = {
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
          launchAfterClose: false,
          settled: left(canceledFailure),
          settledStatus: "closed",
        },
      },
    ])(
      "stops accepting root-scope launch and cancel requests after the executor closes",
      async ({ given: [entryResult], outcome }) => {
        await using managed = createManagedExecutor();
        const { executor } = managed;
        executor.cancel(executor.scope);
        const launchAfterClose = isSome(
          executor.launch(executor.scope, () => wisp.of(entryResult)),
        );
        executor.cancel(executor.scope);

        const actual = {
          launchAfterClose,
          settled: await waitForSettled(executor, executor),
          settledStatus: executor.status,
        };

        expect(actual).toEqual(outcome);
      },
    );

    test.for([
      {
        given: ["root"] as const,
        outcome: {
          settledStatus: "closed",
          turnFaults: [],
        },
      },
      {
        given: ["nested"] as const,
        outcome: {
          settledStatus: "closed",
          turnFaults: [],
        },
      },
    ])(
      "applies the default round-limit reaper when a launched scope remains stuck while closing",
      async ({ given: [path], outcome }) => {
        await using managed = createManagedExecutor();
        const { executor } = managed;
        const parentScope =
          path === "root"
            ? executor.scope
            : unwrapSome(executor.launch(executor.scope, () => park())).scope;
        const handle = unwrapSome(
          executor.launch(parentScope, () =>
            pipe(
              defer(() => park()),
              wisp.chain(() => spawn(cancel)),
              wisp.chain(() => park()),
            ),
          ),
        );

        const actual = {
          settled: await waitForSettled(executor, handle),
          settledStatus: handle.status,
          turnFaults: managed.turnFaults,
        };

        expect({
          settledStatus: actual.settledStatus,
          turnFaults: actual.turnFaults,
        }).toEqual(outcome);
        expect(either.isLeft(actual.settled)).toBe(true);
        expect(failureCause(actual.settled)).toEqual(
          expect.objectContaining({
            kind: "external",
            message: "Scope did not finish closing within the executor reaper round limit",
            raw: {
              round: 2,
              roundLimit: 2,
            },
          }),
        );
      },
    );

    test.for([
      {
        given: ["root", "root"] as const,
        outcome: {
          firstSettledStatus: "closed",
          secondSettledStatus: "closed",
        },
      },
    ])(
      "starts a fresh default round-limit budget for each stuck launched scope",
      async ({ given: [firstPath, secondPath], outcome }) => {
        await using managed = createManagedExecutor();
        const { executor } = managed;
        const firstParentScope =
          firstPath === "root"
            ? executor.scope
            : unwrapSome(executor.launch(executor.scope, () => park())).scope;
        const first = unwrapSome(
          executor.launch(firstParentScope, () =>
            pipe(
              defer(() => park()),
              wisp.chain(() => spawn(cancel)),
              wisp.chain(() => park()),
            ),
          ),
        );
        const secondParentScope =
          secondPath === "root"
            ? executor.scope
            : unwrapSome(executor.launch(executor.scope, () => park())).scope;
        const second = unwrapSome(
          executor.launch(secondParentScope, () =>
            pipe(
              defer(() => park()),
              wisp.chain(() => spawn(cancel)),
              wisp.chain(() => park()),
            ),
          ),
        );

        const actual = {
          firstSettled: await waitForSettled(executor, first),
          firstSettledStatus: first.status,
          secondSettled: await waitForSettled(executor, second),
          secondSettledStatus: second.status,
        };

        expect({
          firstSettledStatus: actual.firstSettledStatus,
          secondSettledStatus: actual.secondSettledStatus,
        }).toEqual(outcome);
        expect(either.isLeft(actual.firstSettled)).toBe(true);
        expect(failureCause(actual.firstSettled)).toEqual(
          expect.objectContaining({
            kind: "external",
            message: "Scope did not finish closing within the executor reaper round limit",
            raw: {
              round: 2,
              roundLimit: 2,
            },
          }),
        );
        expect(either.isLeft(actual.secondSettled)).toBe(true);
        expect(failureCause(actual.secondSettled)).toEqual(
          expect.objectContaining({
            kind: "external",
            message: "Scope did not finish closing within the executor reaper round limit",
            raw: {
              round: 2,
              roundLimit: 2,
            },
          }),
        );
      },
    );
  });
});

async function launchReceiver(executor: Executor): Promise<LaunchedReceiver<string, string>> {
  const sender = Promise.withResolvers<ChannelSender<string, string>>();
  const handle = unwrapSome(
    executor.launch(executor.scope, () =>
      pipe(
        channel<string, string>(1),
        wisp.chain(([receiver, nextSender]) =>
          pipe(
            wisp.fromIO(() => {
              sender.resolve(nextSender);
              return receiver;
            }),
            wisp.chain(receive),
          ),
        ),
      ),
    ),
  );

  return { handle, sender: await sender.promise };
}

interface LaunchedReceiver<Value, Outcome> {
  readonly handle: LaunchHandle<ReceiveResult<Value, Outcome>>;
  readonly sender: ChannelSender<Value, Outcome>;
}

function failureCause(result: FutureResult<unknown>): unknown {
  return either.isLeft(result) ? (result.left as { cause?: unknown }).cause : null;
}

function launchedResult<Result>(result: Result): FutureResult<Result> {
  return right(result);
}
