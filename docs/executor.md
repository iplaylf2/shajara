# Execution Environment

The execution environment builds on the semantic baseline.

## Executor

`Executor` is a long-lived execution environment object. It provides:

- a stable root execution entry
- the ability to start new entry rituals
- the ability to inject future results from the host side
- the ability to cancel execution-entry scopes from the host side

Creation:

```ts
const executor = createExecutor(bindTurn);
```

## Execution Entries

The executor introduces `ExecutionScopeRef` on top of `ScopeRef`.

It is not a new semantic object. It is a scope reference that can serve as an execution entry and an external control target. What matters here is not what a scope is, but which scopes the `Executor` registers and exposes as entries that can be `launch`ed and `cancel`ed.

The executor itself exposes one long-lived root entry:

- `executor.scope`

All subsequent entry launches begin from an `ExecutionScopeRef`.

## Launching

The core `Executor` interface is:

```ts
interface Executor extends LaunchHandle<never> {
  launch<Result>(
    scope: ExecutionScopeRef<unknown>,
    ritual: Ritual<Result>,
  ): Option<LaunchHandle<Result>>;

  settle<Result>(futureSettle: FutureSettleKey<Result>, result: FutureResult<Result>): boolean;

  cancel(scope: ExecutionScopeRef<unknown>): boolean;
}
```

`launch(...)` creates a new entry computation under a given `ExecutionScopeRef` and returns its `LaunchHandle`.

If the target scope is no longer valid or no longer open, it returns `none`.

Each `launch` first establishes an entry scope with `failureMode: "contain"`, then runs the target `ritual` within that boundary. `LaunchHandle.scope` refers to that entry scope.

## Entry Handle

`LaunchHandle<Result>` is the entry handle exposed by the executor:

```ts
interface LaunchHandle<Result> {
  readonly scope: ExecutionScopeRef<Result>;
  readonly status: "open" | "closing" | "closed";
  onSettled(listener: (result: LaunchResult<Result>) => void): Disposer;
}
```

It answers three questions:

- which `ExecutionScopeRef` this `launch` created
- which lifecycle state the entry is currently in
- how that entry eventually converged

`LaunchResult<Result>` has only three result kinds:

- `success`
- `failure`
- `canceled`

The executor itself is also the `LaunchHandle` view of the root scope, so it exposes `status` and `onSettled(...)` as well.

## External Injection

### `future` convergence

`settle(futureSettle, result)` writes a result into a running `future` from outside the execution environment.

- returns `true`: the injection was accepted
- returns `false`: the `future` already converged, or the environment can no longer accept this injection

### scope cancellation

`cancel(scope)` requests cancellation for an execution-entry scope from outside the execution environment.

- returns `true`: the cancellation request was accepted
- returns `false`: the scope is invalid, unregistered, or no longer open

## Slice Progression

`Executor` is created through `BindTurn`, then collaborates with the host through the returned `Pacer`:

```ts
type BindTurn = (flushTurn: () => void) => Pacer;
```

`flushTurn` is the callback the host promises to poll on its own turn cadence.

The returned `Pacer` handles slice progression and deferred follow-up work:

```ts
interface Pacer {
  beginSlice(): Slice;
  continueLater(work: () => void): Disposer;
}

interface Slice {
  shouldYield(): boolean;
}
```

- `beginSlice()` starts a new synchronous slice
- `shouldYield()` decides whether the current slice should yield
- `continueLater(work)` posts subsequent work back to the host side

## Autonomy

`autonomy` adds governance capabilities to selected scopes within the `Executor`. It does not rewrite the basic semantics of `Scope`; it only changes who schedules a scope and when additional adjudication is needed to reclaim a closing scope.

### `scheduler`

```ts
interface Scheduler {
  assign(process: ProcessRef<unknown>): Processor;
}
```

When a process in an autonomous scope becomes runnable, the `Executor` calls `scheduler.assign(process)` and routes it to a `Processor`.

Here, `ProcessRef` is the scheduling target.

### `reaper`

```ts
interface Reaper {
  adjudicate(scope: ScopeRef<unknown>): Wisp<Option<Failure>>;
}
```

When a `closing` scope cannot converge naturally in time, the `Executor` can submit it to a `reaper` for adjudication:

- return `none`: keep waiting for natural convergence
- return `some(failure)`: initiate failure convergence for the target scope with that failure

The `reaper` is responsible for governance decisions.
