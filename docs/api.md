# API

本文档定义用户侧公开 API 与使用约束。用户通过 `@shajara/host` 消费所有能力。

---

## 1. 计算单元

### RiteRoutine

`RiteRoutine<T>` 是用户侧编排单元——generator function，通过 `yield*` 组合原语，通过 `return` 产生结果。

```ts
const myTask: RiteRoutine<string> = function* () {
  yield* cede();
  return "done";
};
```

---

## 2. 宿主入口

### run

```ts
run<T>(ritual: RiteRoutine<T>, options?: { signal?: AbortSignal }): StatefulPromise<T>
```

启动一段 ritual，返回 `StatefulPromise<T>`（`PromiseLike<T>` + `state(): LaunchState`）。运行作用域挂载在全局 root scope 下。

- 成功 → 返回结果值。
- 终止 → 抛出 `ScopeTerminatedError`。
- 失败 → 抛出 `ShajaraError`。

当 `signal` 触发 abort 时，host 终止对应执行作用域。
执行入口在内核侧统一由 `ExecutionScopeRef` 表达（含 root 锚点）。

### createScope

```ts
createScope(): Scope
```

创建宿主侧托管作用域，挂载在全局 root scope 下。返回：

| 成员                           | 说明                                               |
| ------------------------------ | -------------------------------------------------- |
| `scope.run(ritual, options?)`  | 在托管作用域下启动 ritual，行为与顶层 `run` 一致。 |
| `scope.halt()`                 | 触发关闭流程并等待收敛。                           |
| `scope.state`                  | 同步状态快照：`open \| closing \| closed`。        |
| `scope.closed`                 | 清理完成后 resolve；终止/失败时按对应类型抛出。    |
| `scope[Symbol.asyncDispose]()` | 等价于 `scope.halt()`。                            |

---

## 3. 宿主桥接操作

以下操作在 `RiteRoutine` 内通过 `yield*` 使用，属于上下文敏感入口。

### action

```ts
yield* action<T>(): Action<T>   // { future, resolve, reject }
```

获取宿主侧可结算能力记录，返回结果以 future 形式暴露，由宿主侧 `resolve/reject` 单次收敛。

### sleep

```ts
yield* sleep(milliseconds): void
```

等待一段宿主时间。

### until

```ts
yield* until<T>(thunk: () => PromiseLike<T>): T
```

桥接一个 promise thunk，等待完成后返回结果值，reject 按异常传播。

### resource

```ts
yield* resource<T>(body: (provide) => ...): RiteFuture<T>
```

声明一个带 cleanup 的作用域协议；`body` 通过 `provide(value)` 暴露值，并在所属 scope 回收时执行 cleanup。

---

## 4. 编排原语

原语调用返回 `RiteCoroutine`；在 `RiteRoutine` 内通过 `yield*` 使用时，得到该原语的结果值。

### 4.1 并发构造

| 原语        | 签名概要                                     | 说明                                                                                                                                             |
| ----------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `spawn`     | `spawn(ritual) → ScopeRef`                   | 创建 standard 子 Scope 并引入并行分支。                                                                                                          |
| `scoped`    | `scoped(ritual) → T`                         | 创建显式 supervisor boundary，并等待该子树收敛。                                                                                                 |
| `resumable` | `resumable(ritual) → RiteFuture<T>`          | 声明可恢复计算，并立即返回 entry 结果对应的 future。                                                                                             |
| `guard`     | `guard(entry, recover) → RiteFuture<T>`      | 为 `entry` 内部的 `resumable` 提供 `recover` 恢复处理，并立即返回该边界收敛结果对应的 future。`recover` 返回值视为恢复成功，抛异常视为恢复失败。 |
| `all`       | `all(rituals) → RiteFuture<T>`               | 聚合启动多个分支，立即返回 future；需要配合 `wait` 显式等待。                                                                                    |
| `race`      | `race(rituals) → RiteFuture<ArrayValues<T>>` | 选择最先完成者，触发其余分支收敛；调用本身不阻塞，需显式 `wait`。`rituals` 为非空 tuple（至少一个分支）。                                        |

并发原语以结构化并发传播语义为默认形态；显式的 supervisor 收敛边界由 `scoped` 表达。

### 4.2 基础

| 原语          | 签名概要                                             | 说明                                                            |
| ------------- | ---------------------------------------------------- | --------------------------------------------------------------- |
| `future`      | `future<T>() → [RiteFuture<T>, RiteFutureSettle<T>]` | 在当前 Scope 内创建一个 pending future 及其 settle capability。 |
| `poll`        | `poll(future) → T \| undefined`                      | 非阻塞观察 future；未收敛时返回 `undefined`。                   |
| `settle`      | `settle(futureSettle, value) → void`                 | 通过 settle capability 将 future 收敛为成功值。                 |
| `settleError` | `settleError(futureSettle, error) → void`            | 通过 settle capability 将 future 收敛为 `Error` 失败。          |
| `wait`        | `wait(future) → T`                                   | 等待 future 收敛并返回结果。                                    |
| `send`        | `send(scopeRef, messageKey, value) → void`           | 向目标 Scope 上由 `messageKey` 选中的 mailbox 投递消息。        |
| `receive`     | `receive(messageKey) → T`                            | 在当前 Scope 上等待指定 `messageKey` 的下一条消息并返回其值。   |
| `bind`        | `bind(ContextKey<T>, value) → void`                  | 在当前 Scope 绑定值。                                           |
| `unbind`      | `unbind(ContextKey<T>) → void`                       | 在当前 Scope 解绑值；后续 `lookup` 将继续沿祖先链解析。         |
| `lookup`      | `lookup(ContextKey<T>) → T \| undefined`             | 沿祖先链解析值；未命中时返回 `undefined`。                      |
| `self`        | `self() → SelfDescriptor`                            | 读取当前执行实体的自省信息。                                    |
| `halt`        | `halt() → never`                                     | 触发当前 Scope 的终止级联。                                     |
| `cede`        | `cede() → void`                                      | 协作式让权。                                                    |
| `park`        | `park() → never`                                     | 持续挂起，直到父 scope 回收清理阶段触发。                       |

---

## 5. 使用约束

- 原语通过 `yield* 原语(...)` 调用。
- 用户侧不直接接触 kernel 契约细节。
- 用户可观察的生命周期粒度是 Scope，不是 Process。
- 编排层通过 `spawn` 句柄上的 `exitFuture` 配合 `wait`、通过 `RiteFuture` 配合 `wait` 等待收敛，不透出底层 future/scope 结构细节。
- generator 侧成功通过返回值表达，失败由 host 以异常抛出传播。
