# API

本文档定义用户侧公开 API 与使用方式。用户通过 `@shajara/host` 消费所有能力。

---

## 1. 计算单元

### RiteRoutine

`RiteRoutine<T>` 是用户侧编排单元：generator function，通过 `yield*` 组合编排操作，通过 `return` 产生结果。本文把这些可通过 `yield*` 调用的编排操作统称为原语。

```ts
const myTask: RiteRoutine<string> = function* () {
  yield* cede();
  return "done";
};
```

---

## 2. Scope

每段 ritual 都运行在某个 `Scope` 内。把 `Scope` 理解成一段计算的边界时，它决定：

- 生命周期归属
- 上下文值的可见范围
- future 的归属范围
- 子流程的失败传播与收敛位置

不同原语会以不同方式使用 `Scope`：有的在当前 `Scope` 内展开并发，有的创建新的 `Scope`，有的让一组子流程共享同一个组合 `Scope`。

---

## 3. 宿主入口

### run

```ts
run<T>(ritual: RiteRoutine<T>, options?: { signal?: AbortSignal }): StatefulPromise<T>
```

启动一段 ritual，返回 `StatefulPromise<T>`（`PromiseLike<T>` + `state(): LaunchState`）。

- 成功时返回结果值。
- 终止时抛出 `ScopeTerminatedError`。
- 失败时抛出 `Error`；结构性失败表现为 `ShajaraError` 子类，用户代码抛出的外部异常会尽量保留原始实例。

当 `signal` 触发 abort 时，对应运行被终止。

### createScope

```ts
createScope(): Scope
```

创建一个托管 `Scope`。返回：

| 成员                           | 说明                                                |
| ------------------------------ | --------------------------------------------------- |
| `scope.run(ritual, options?)`  | 在该 `Scope` 下启动 ritual，行为与顶层 `run` 一致。 |
| `scope.halt()`                 | 终止该 `Scope` 并等待收敛。                         |
| `scope.state`                  | 同步状态快照：`open \| closing \| closed`。         |
| `scope.closed`                 | 清理完成后 resolve；终止/失败时按对应类型抛出。     |
| `scope[Symbol.asyncDispose]()` | 等价于 `scope.halt()`。                             |

---

## 4. 宿主操作

以下操作在 `RiteRoutine` 内通过 `yield*` 使用。

### action

```ts
yield* action<T>(): Action<T>   // { future, resolve, reject }
```

获取一组宿主侧可结算能力。宿主代码稍后通过 `resolve` / `reject` 完成单次收敛，ritual 侧通过返回的 `future` 观察结果。

### sleep

```ts
yield* sleep(milliseconds): void
```

等待一段宿主时间。

### until

```ts
yield* until<T>(thunk: () => PromiseLike<T>): T
```

桥接一个 promise thunk，等待完成后返回结果值；reject 按异常传播。

### resource

```ts
yield* resource<T>(body: (provide) => ...): RiteFuture<T>
```

声明一个宿主资源协议。`body` 通过 `provide(value)` 暴露值，并在所属 `Scope` 回收时执行 cleanup。

---

## 5. 编排原语

原语是在 `RiteRoutine` 内通过 `yield*` 调用的编排操作。每个原语都有自己的返回值形状；`yield*` 得到的就是该原语的结果值。

### 5.1 并发构造

| 原语        | 签名概要                                     | 说明                                                                                                                 |
| ----------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `spawn`     | `spawn(ritual) → RiteFuture<T>`              | 在当前 `Scope` 内启动一个并行分支，并返回该分支结果的 future。                                                       |
| `enclose`   | `enclose(ritual) → T`                        | 创建一个独立收敛的 `Scope`，运行子流程并等待它完成。                                                                 |
| `resumable` | `resumable(ritual) → RiteFuture<T>`          | 声明一段可由外围 `guard` 恢复的计算，并返回其结果 future。                                                           |
| `guard`     | `guard(entry, recover) → RiteFuture<void>`   | 运行一段带恢复逻辑的子流程；其中 `resumable` 的失败交给 `recover(error)` 处理。                                      |
| `all`       | `all(rituals) → RiteFuture<T>`               | 并行启动多个子流程，返回聚合结果 future；需要配合 `wait` 显式等待。                                                  |
| `race`      | `race(rituals) → RiteFuture<ArrayValues<T>>` | 并行启动一组共享竞速 `Scope` 的分支，返回最先完成者的结果 future；需要配合 `wait` 显式等待。`rituals` 为非空 tuple。 |

### 5.2 基础

| 原语          | 签名概要                                             | 说明                                                            |
| ------------- | ---------------------------------------------------- | --------------------------------------------------------------- |
| `future`      | `future<T>() → [RiteFuture<T>, RiteFutureSettle<T>]` | 在当前 `Scope` 创建一个 pending future 及其 settle capability。 |
| `poll`        | `poll(future) → T \| undefined`                      | 非阻塞观察 future；未收敛时返回 `undefined`。                   |
| `settle`      | `settle(futureSettle, value) → void`                 | 将 future 收敛为成功值。                                        |
| `settleError` | `settleError(futureSettle, error) → void`            | 将 future 收敛为失败。                                          |
| `wait`        | `wait(future) → T`                                   | 等待 future 收敛并返回结果。                                    |
| `bind`        | `bind(ContextKey<T>, value) → void`                  | 在当前 `Scope` 绑定一个上下文值。                               |
| `unbind`      | `unbind(ContextKey<T>) → void`                       | 在当前 `Scope` 解绑一个上下文值。                               |
| `lookup`      | `lookup(ContextKey<T>) → T \| undefined`             | 读取当前 `Scope` 可见的上下文值；未命中时返回 `undefined`。     |
| `self`        | `self() → SelfHandle`                                | 读取当前执行信息。                                              |
| `halt`        | `halt() → never`                                     | 终止当前流程。                                                  |
| `cede`        | `cede() → void`                                      | 协作式让权。                                                    |
| `park`        | `park() → never`                                     | 持续挂起，直到外部结束该流程。                                  |

---

## 6. 使用方式

- 原语通过 `yield* 原语(...)` 调用。
- 需要并发结果句柄时，使用 `spawn` 返回的 `RiteFuture`。
- 需要显式等待结果时，使用 `wait(future)`。
- 需要独立收敛或恢复语义时，使用 `enclose`、`guard`、`resumable`。
- generator 侧成功通过返回值表达，失败由 host 以异常抛出传播。
