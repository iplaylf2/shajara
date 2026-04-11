import type { ExecutionScopeRef, FutureSettleKey } from "#/index";
import { cancel, defer, future, halt, park, settle, spawn, wait } from "#/index";
import { createManagedExecutor, unwrapSome, waitForSettled } from "#test/harness";
import { describe, expect, test } from "vitest";
import { iife, isSome, left, right } from "#/utils";
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

        expect(actual).toEqual({
          ...outcome,
          failure: expect.objectContaining({
            cause: expect.objectContaining({
              failure,
            }),
          }),
        });
      },
    );

    test.for([
      {
        given: ["listener-threw", "throws", "records"] as const,
        outcome: {
          listenerCalls: ["throws", "records"],
          settled: {
            kind: "canceled",
          },
          settledStatus: "closed",
          turnFaults: [expect.objectContaining({ message: "listener-threw" })],
        },
      },
    ])(
      "suppresses onSettled listener exceptions without blocking settlement delivery",
      async ({ given: [causeMessage, throwingEntry, recordingEntry], outcome }) => {
        const listenerCalls: string[] = [];
        const actual = await iife(async () => {
          await using managed = createManagedExecutor();
          const { executor } = managed;

          const handle = unwrapSome(executor.launch(executor.scope, () => park()));
          handle.onSettled(() => {
            listenerCalls.push(throwingEntry);
            throw new Error(causeMessage);
          });
          handle.onSettled(() => {
            listenerCalls.push(recordingEntry);
          });

          executor.cancel(handle.scope);
          return {
            listenerCalls,
            settled: await waitForSettled(handle),
            settledStatus: handle.status,
            turnFaults: managed.turnFaults,
          };
        });

        expect(actual).toEqual(outcome);
      },
    );

    test.for([
      {
        given: ["first-listener-threw", "second-listener-threw"] as const,
        outcome: {
          settled: {
            kind: "canceled",
          },
          settledStatus: "closed",
          turnFaultErrorCounts: [2],
          turnFaultKinds: ["AggregateError"],
          turnFaultMessages: ["Out-of-band failures occurred while processing executor work"],
        },
      },
    ])(
      "aggregates multiple onSettled listener exceptions raised in the same settlement turn",
      async ({ given: [firstCauseMessage, secondCauseMessage], outcome }) => {
        const actual = await iife(async () => {
          await using managed = createManagedExecutor();
          const { executor } = managed;

          const handle = unwrapSome(executor.launch(executor.scope, () => park()));
          handle.onSettled(() => {
            throw new Error(firstCauseMessage);
          });
          handle.onSettled(() => {
            throw new Error(secondCauseMessage);
          });

          executor.cancel(handle.scope);
          const settled = await waitForSettled(handle);
          await new Promise<void>((resolve) => {
            globalThis.setTimeout(resolve, 0);
          });

          return {
            settled,
            settledStatus: handle.status,
            turnFaultErrorCounts: managed.turnFaults.map((fault) =>
              fault instanceof AggregateError ? fault.errors.length : 0,
            ),
            turnFaultKinds: managed.turnFaults.map((fault) => fault?.constructor?.name),
            turnFaultMessages: managed.turnFaults.map((fault) =>
              fault instanceof Error ? fault.message : String(fault),
            ),
          };
        });

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
          launchAfterClose: true,
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
          secondSettle: true,
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
            result: null,
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

        expect(actual).toEqual({
          ...outcome,
          settled: {
            ...outcome.settled,
            result: left(failure),
          },
        });
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
          secondCancel: true,
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
          cancelAfterClose: true,
          launchAfterClose: true,
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
          settled: await waitForSettled(handle),
          settledStatus: handle.status,
          turnFaults: managed.turnFaults,
        };

        expect({
          settledStatus: actual.settledStatus,
          turnFaults: actual.turnFaults,
        }).toEqual(outcome);
        expect(actual.settled.kind).toBe("failure");
        expect(
          actual.settled.kind === "failure"
            ? (actual.settled.failure as { cause?: { failure?: unknown; kind?: string } }).cause
                ?.failure
            : null,
        ).toEqual(
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
          firstSettled: await waitForSettled(first),
          firstSettledStatus: first.status,
          secondSettled: await waitForSettled(second),
          secondSettledStatus: second.status,
        };

        expect({
          firstSettledStatus: actual.firstSettledStatus,
          secondSettledStatus: actual.secondSettledStatus,
        }).toEqual(outcome);
        expect(actual.firstSettled.kind).toBe("failure");
        expect(
          actual.firstSettled.kind === "failure"
            ? (actual.firstSettled.failure as { cause?: { failure?: unknown } }).cause?.failure
            : null,
        ).toEqual(
          expect.objectContaining({
            kind: "external",
            message: "Scope did not finish closing within the executor reaper round limit",
            raw: {
              round: 2,
              roundLimit: 2,
            },
          }),
        );
        expect(actual.secondSettled.kind).toBe("failure");
        expect(
          actual.secondSettled.kind === "failure"
            ? (actual.secondSettled.failure as { cause?: { failure?: unknown } }).cause?.failure
            : null,
        ).toEqual(
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
