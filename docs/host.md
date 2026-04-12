# 宿主适配

`@shajara/host` 在 `Executor` 与基础语义之上建立 generator 风格宿主层。

## 宿主层职责

host 负责三类事情：

- 提供面向应用代码的运行入口：`run`、`createScope`、`action`、`sleep`、`until`
- 提供 generator 风格原语：`@shajara/host/primitives`
- 把 kernel 失败映射成 JavaScript 错误对象

## 入口适配

host 用两条边界适配 kernel：

- `decodeRitual`：`RiteRoutine<T>` -> kernel `Ritual<T>`
- `encodeRitual`：kernel `Ritual<T>` -> `RiteCoroutine<T>`

对应类型：

```ts
type RiteRoutine<T> = () => RiteCoroutine<T>;
type RiteCoroutine<T> = Generator<Sigil, T, unknown>;
```

在 host 中，`Ritual` 表示“应用代码如何以 generator 写出同一段计算”。

## 结果通道

host 与 kernel 的主要区别，不是能力集合，而是结果通道。

典型改写如下：

- kernel `wait(future)` 返回 `Either<FailureShape, T>`
- host `wait(future)` 返回 `T`，失败时抛错

- kernel `lookup(key)` 返回 `Option<T>`
- host `lookup(key)` 返回 `T | undefined`

- kernel `enclose(ritual)` 返回 `Either<FailureShape, T>`
- host `enclose(ritual)` 返回 `T`，失败时抛错

因此 host 中的 `Future`、`Scope`、`Failure` 都以用户可见结果为主。

## 错误映射

host 会把 kernel 失败映射成 JavaScript 错误对象。

### 写入 kernel 的方向

以下入口会把宿主错误改写成 kernel 失败：

- `halt(error)`
- `settleError(futureSettle, error)`
- `action.reject(error)`
- `until(...).catch(...)`

### 从 kernel 返回的方向

host 通过 `fromFailure(...)` 做统一映射：

- `canceled` -> `CanceledError`
- `interrupted` -> `InterruptedError`
- `scope` -> `ScopeError`
- `external` -> 原始 `Error` 或 `ExternalError`

这里 `ScopeError` 的含义是：调用方看到的已经不是单个原始异常，而是“某个 scope 以该根因失败收敛”这一结构事实。

原始根因位于：

- `ScopeError.cause.failure`
- 若该根因来自 `external` failure，则原始外部值位于 `raw`

## 运行入口

### `run`

`run` 的职责是把宿主 `ritual` 接到长期 `Executor` 上，并把 `LaunchHandle` 暴露成带 `status` 的 Promise。

结果语义是：

- 成功时 resolve 结果值
- 取消时 reject `CanceledError`
- 失败时 reject `Error`
- 结构性失败通常表现为 `ScopeError`

### `createScope`

`createScope` 的职责是从 `Executor` 根入口派生一个长期托管 scope，并向调用方公开：

- `run(...)`
- `cancel()`
- `status`
- `closed`

这里的 scope 重点是宿主侧的运行边界，而不是再次解释 kernel scope 的内部语义。

关闭语义是：

- `cancel()` 会等待该 scope 的关闭结果
- `closed` 会在该 scope 完全关闭后 settle
- 若关闭结果是取消或失败，`cancel()` 与 `closed` 都反映同一个结果

## 宿主接入

### `action`

`action()` 为宿主代码暴露一组 `future` 收敛能力：

- `future`
- `resolve(value)`
- `reject(error)`

### `sleep`

`sleep(milliseconds)` 用宿主计时器恢复等待中的计算。

### `until`

`until(thunk)` 用 promise 的 fulfilled / rejected 回调把结果写回 future。

这三者把浏览器或 JavaScript 宿主对象接回 `Executor` 可消费的收敛通道。

## 自治治理的宿主适配

host 暴露的 `autonomy(entry, options)` 复用了 kernel 的 `autonomy`，但在 `reaper` 上采用宿主切面：

- host `reaper` 的形状是 `(scope) => RiteCoroutine<void>`
- 正常返回表示继续等待
- 抛出异常表示以该异常为根因提交失败仲裁
