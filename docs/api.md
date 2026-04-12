# 公开接口

本篇汇总公开导出面与调用结果。

## 发布包

### `@shajara/host`

面向应用代码。根入口重导出：

- `contracts`
- `errors`
- `operations`

根入口名称包括：

- 运行入口：`run`、`createScope`
- 宿主操作：`action`、`sleep`、`until`
- 错误类型：`ShajaraError`、`CanceledError`、`ExternalError`、`InterruptedError`、`ScopeError`
- host 契约：`RiteRoutine`、`RiteCoroutine`、`RiteFuture`、`RiteFutureSettle`、`RiteFutureHandle`
- kernel 契约重导出：`ContextKey`、`Failure`、`FailureShape`、`FutureKey`、`LaunchStatus`、`ScopeRef`、`SelfHandle`、`contextKey`
- 其余根入口类型：`Action`、`Scope`、`ScopeStatus`、`RunOptions`、`StatefulPromise`、`PromiseThunk`、`Disposer`

子路径 `@shajara/host/primitives` 公开：

- 并发与边界：`all`、`autonomy`、`enclose`、`guard`、`race`、`resource`、`resumable`、`spawn`
- future：`future`、`poll`、`settle`、`settleError`、`wait`
- 上下文与自省：`bind`、`lookup`、`self`、`unbind`
- 控制与生命周期：`cancel`、`cede`、`defer`、`halt`、`park`

### `@shajara/kernel`

面向底层实现。根入口重导出：

- `contracts`
- `executor`
- `failures`
- `primitives`

根入口名称包括：

- contracts：`Wisp`、`Ritual`、`ScopeRef`、`ProcessRef`、`FutureKey`、`FutureSettleKey`、`FutureHandle`、`ContextKey`、`MessageKey`、`contextKey`、`messageKey`
- failures：`Failure`、`canceledFailure`、`externalFailure`、`interruptedFailure`、`scopeFailure`
- executor：`createExecutor`、`Executor`、`LaunchHandle`、`LaunchResult`、`LaunchStatus`、`Pacer`、`Slice`、`ExecutionScopeRef`、`autonomy` 相关类型
- primitives：对应的 `Wisp` 原语

子路径公开：

- `@shajara/kernel/sigils`
- `@shajara/kernel/utils`

## 宿主入口

### `run`

```ts
run<Return>(
  ritual: RiteRoutine<Return>,
  options?: { signal?: AbortSignal },
): StatefulPromise<Return>
```

返回值：

- 是 Promise
- 同时带只读 `status`
- `status` 取值为 `open | closing | closed`

结果：

- 成功时 resolve 结果值
- 取消时 reject `CanceledError`
- 失败时 reject `Error`
- 结构性失败通常表现为 `ScopeError`

### `createScope`

```ts
createScope(): Scope
```

返回对象公开：

- `run(ritual, options?)`
- `cancel()`
- `status`
- `closed`
- `[Symbol.asyncDispose]()`

结果语义：

- `cancel()` 会等待该 scope 的关闭结果
- `closed` 表示同一个关闭结果
- 若该 scope 以取消或失败结束，`cancel()` 与 `closed` 会 reject 对应错误
- 已关闭 scope 上再次 `run(...)` 会同步抛错

## 宿主操作

### `action`

```ts
yield * action<Return>();
```

返回：

- `future`
- `resolve(value)`
- `reject(error)`

### `sleep`

```ts
yield * sleep(milliseconds);
```

### `until`

```ts
yield * until(thunk);
```

## 宿主原语返回值

### 并发与边界

| 原语        | 返回值             |
| ----------- | ------------------ |
| `spawn`     | `RiteFuture<T>`    |
| `all`       | `RiteFuture<T[]>`  |
| `race`      | `RiteFuture<T>`    |
| `enclose`   | `T`                |
| `resumable` | `RiteFuture<T>`    |
| `guard`     | `RiteFuture<void>` |
| `resource`  | `RiteFuture<T>`    |
| `autonomy`  | `RiteFuture<T>`    |

### future 原语

| 原语          | 返回值                                 |
| ------------- | -------------------------------------- |
| `future`      | `[RiteFuture<T>, RiteFutureSettle<T>]` |
| `poll`        | `T \| undefined`                       |
| `settle`      | `void`                                 |
| `settleError` | `void`                                 |
| `wait`        | `T`                                    |

### 上下文、控制与生命周期

| 原语     | 返回值           |
| -------- | ---------------- |
| `bind`   | `void`           |
| `lookup` | `T \| undefined` |
| `unbind` | `void`           |
| `self`   | `SelfHandle`     |
| `halt`   | `never`          |
| `cancel` | `never`          |
| `cede`   | `void`           |
| `defer`  | `void`           |
| `park`   | `never`          |

## Kernel 原语结果模型

`@shajara/kernel` 与 host 的主要接口差异在返回值模型：

- kernel `wait(future)` 返回 `Either<FailureShape, T>`
- kernel `poll(future)` 返回 `Option<Either<FailureShape, T>>`
- kernel `enclose(ritual)` 返回 `Either<FailureShape, T>`

直接消费 kernel 时，结果模型就是这些显式结果值。
