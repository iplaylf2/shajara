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
createScope(): HostScope
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
yield* action<T>(): HostAction<T>   // { scope, resolve, reject }
```

获取宿主侧可结算能力记录，作用域归属当前执行上下文分支。

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

---

## 4. 编排原语

原语在 `RiteRoutine` 内通过 `yield*` 使用，直接得到 `RiteCoroutine`。

### 4.1 并发构造

| 原语        | 签名概要                             | 说明                                                                                                              |
| ----------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| `spawn`     | `spawn(ritual, options?) → ScopeRef` | 创建子 Scope 并引入并行分支；`options` 为 sum type：`{ mode: "supervisor" }` 或 `{ mode: "recovery", recover }`。 |
| `all`       | `all(rituals) → T`                   | 聚合等待多个分支。                                                                                                |
| `race`      | `race(rituals) → ArrayValues<T>`     | 选择最先完成者，触发其余分支收敛。`rituals` 为非空 tuple（至少一个分支）。                                        |
| `scoped`    | `scoped(ritual) → T`                 | 创建 `SupervisorScope` 子 Scope 并立即等待收敛。                                                                  |
| `resource`  | `resource(body) → T`                 | 创建资源作用域；等待 `provide(value)` 返回首值，资源作用域在 provide 后挂起，父 scope 回收时清理。                |
| `resumable` | `resumable(ritual) → T`              | 在 `scoped` body 内声明可恢复边界。                                                                               |

`recovery` 选项仅影响 `resumable` 委派恢复路径：`recover` 返回值视为恢复成功，抛异常视为恢复失败。

### 4.2 基础

| 原语      | 签名概要                                   | 说明                                                     |
| --------- | ------------------------------------------ | -------------------------------------------------------- |
| `join`    | `join(scopeRef) → T`                       | 等待 spawn 句柄对应作用域完成并返回结果。                |
| `send`    | `send(scopeRef, messageKey, value) → void` | 向目标 Scope 上由 `messageKey` 选中的 mailbox 投递消息。 |
| `receive` | `receive(messageKey) → { value, from }`    | 在当前 Scope 上等待指定 `messageKey` 的下一条消息。      |
| `halt`    | `halt() → never`                           | 触发当前 Scope 的终止级联。                              |
| `cede`    | `cede() → void`                            | 协作式让权。                                             |
| `suspend` | `suspend() → never`                        | 持续挂起，直到父 scope 回收清理阶段触发。                |

### 4.3 上下文与自省

| 原语         | 签名概要                                 | 说明                                       |
| ------------ | ---------------------------------------- | ------------------------------------------ |
| `bind`       | `bind(ContextKey<T>, value) → void`      | 在当前 Scope 绑定值。                      |
| `lookup`     | `lookup(ContextKey<T>) → T \| undefined` | 沿祖先链解析值；未命中时返回 `undefined`。 |
| `messageKey` | `messageKey<T>() → MessageKey<T>`        | 创建消息匹配 key，用于 `send/receive`。    |
| `self`       | `self() → SelfDescriptor`                | 读取当前执行实体的自省信息。               |

---

## 5. 使用约束

- 原语通过 `yield* 原语(...)` 调用，不使用 `yield* 原语(...)()` 形式。
- 用户侧不直接接触 kernel 契约细节。
- 用户可观察的生命周期粒度是 Scope，不是 Process。
- 编排层通过 `spawn` 句柄配合 `join` 等待分支收敛，不透出底层 scope 结构字段。
- generator 侧成功通过返回值表达，失败由 host 以异常抛出传播。
- 控制面契约统一以 `*Ref` 表达能力句柄。
- `createScope` 属于宿主入口（非 primitives），生命周期由 `halt()` 或 `asyncDispose` 治理。
