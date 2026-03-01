# API

本文档定义用户侧公开 API 与使用约束。用户通过 `@khora/runtime` 消费所有能力。

---

## 1. 计算单元

### RuntimeBlueprint

`RuntimeBlueprint<T>` 是用户侧编排单元——generator function，通过 `yield*` 组合原语，通过 `return` 产生结果。

```ts
const myTask: RuntimeBlueprint<string> = function* () {
  yield* cede();
  return "done";
};
```

---

## 2. 宿主入口

### run

```ts
run<T>(blueprint: RuntimeBlueprint<T>, options?: { signal?: AbortSignal }): StatefulPromise<T>
```

启动一段蓝图，返回 `StatefulPromise<T>`（`PromiseLike<T>` + `state(): LaunchState`）。运行作用域挂载在全局 root scope 下。

- 成功 → 返回结果值。
- 终止 → 抛出 `ScopeTerminatedError`。
- 失败 → 抛出 `KhoraError`。

当 `signal` 触发 abort 时，runtime 终止对应执行作用域。

### createScope

```ts
createScope(): RuntimeScope
```

创建宿主侧托管作用域，挂载在全局 root scope 下。返回：

| 成员                             | 说明                                            |
| -------------------------------- | ----------------------------------------------- |
| `scope.run(blueprint, options?)` | 在托管作用域下启动蓝图，行为与顶层 `run` 一致。 |
| `scope.halt()`                   | 触发关闭流程并等待收敛。                        |
| `scope.state`                    | 同步状态快照：`open \| closing \| closed`。     |
| `scope.closed`                   | 清理完成后 resolve；终止/失败时按对应类型抛出。 |
| `scope[Symbol.asyncDispose]()`   | 等价于 `scope.halt()`。                         |

---

## 3. 宿主桥接操作

以下操作在 `RuntimeBlueprint` 内通过 `yield*` 使用，属于上下文敏感入口。

### action

```ts
yield* action<T>(): RuntimeAction<T>   // { scope, resolve, reject }
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

原语在 `RuntimeBlueprint` 内通过 `yield*` 使用，直接得到 `RuntimePlan`。

### 4.1 并发构造

| 原语        | 签名概要                             | 说明                                                                                               |
| ----------- | ------------------------------------ | -------------------------------------------------------------------------------------------------- |
| `spawn`     | `spawn(blueprint, spec?) → ScopeRef` | 创建子 Scope 并引入并行分支。`spec` 由 `@khora/kernel/scopes` 生成。                               |
| `all`       | `all(blueprints) → T`                | 聚合等待多个分支。                                                                                 |
| `race`      | `race(blueprints) → ArrayValues<T>`  | 选择最先完成者，触发其余分支收敛。                                                                 |
| `scoped`    | `scoped(blueprint, options?) → T`    | 创建子 Scope 并立即等待收敛。`options` 可含 `spec` 与 `onResumableBranchFailure`。                 |
| `resource`  | `resource(body) → T`                 | 创建资源作用域；等待 `provide(value)` 返回首值，资源作用域在 provide 后挂起，父 scope 回收时清理。 |
| `resumable` | `resumable(blueprint) → T`           | 在 `scoped` body 内声明可恢复边界。                                                                |

`onResumableBranchFailure` 是 `resumable` 路径后代失败的捕获 handler，入参类型为 `KhoraError`，返回 `RuntimePlan<unknown>`，不改写 `scoped` 的成功返回类型。

### 4.2 基础

| 原语      | 签名概要             | 说明                                      |
| --------- | -------------------- | ----------------------------------------- |
| `join`    | `join(scopeRef) → T` | 等待 spawn 句柄对应作用域完成并返回结果。 |
| `halt`    | `halt() → never`     | 触发当前 Scope 的终止级联。               |
| `cede`    | `cede() → void`      | 协作式让权。                              |
| `suspend` | `suspend() → never`  | 持续挂起，直到父 scope 回收清理阶段触发。 |

### 4.3 上下文与自省

| 原语     | 签名概要                  | 说明                         |
| -------- | ------------------------- | ---------------------------- |
| `bind`   | `bind(key, value) → void` | 在当前 Scope 绑定值。        |
| `lookup` | `lookup(key) → T`         | 沿祖先链解析值。             |
| `self`   | `self() → SelfDescriptor` | 读取当前执行实体的自省信息。 |

---

## 5. 使用约束

- 原语通过 `yield* 原语(...)` 调用，不使用 `yield* 原语(...)()` 形式。
- 用户侧不直接接触 kernel 契约细节。
- 用户可观察的生命周期粒度是 Scope，不是 Process。
- 编排层通过 `spawn` 句柄配合 `join` 等待分支收敛，不透出底层 scope 结构字段。
- generator 侧成功通过返回值表达，失败由 runtime 以异常抛出传播。
- 控制面契约统一以 `*Ref` 表达能力句柄。
- `createScope` 属于宿主入口（非 primitives），生命周期由 `halt()` 或 `asyncDispose` 治理。
