# 语义基线

基础语义由本篇定义。

## 计算承载

### `Wisp`

`Wisp<T>` 是基础计算承载面。

- `stirring`：携带一枚 `sigil`，并等待对应 `echo` 继续推进
- `resting`：携带最终 `relic`

执行时，运行时解释 `sigil`，得到 `echo`，再把 `echo` 交回 `resonate`，直到进入 `resting`。

### `Ritual`

`Ritual<T>` 是 `() => Wisp<T>`。它表示一段延迟显现的计算入口。

### `Sigil`

`Sigil` 是运行时可解释的指令对象。每种 sigil 通过自己的类型见证声明 `echo` 形状。

公开的 sigil 种类包括：

- 上下文：`bind`、`lookup`、`unbind`
- 生命周期：`cancel`、`cede`、`defer`、`halt`
- 并发：`branch`、`spawn`
- future：`future`、`poll`、`settle`、`wait`
- 消息：`send`、`receive`
- 自省：`self`

## 结构对象

### `Scope`

`Scope` 是结构化并发边界，统一承载：

- process 归属
- 上下文可见性
- future 归属
- 失败传播与取消收敛

`ScopeRef<T>` 是 scope 的控制面引用，并显式携带 `exitFuture`。

每个 scope 在创建时带有只读 `ScopeDescriptor`。其中与收敛相关的字段是：

```ts
type FailureMode = "propagate" | "contain";
```

- `propagate`：该 scope 的失败继续向父链传播
- `contain`：该 scope 自身构成失败与取消的收敛边界

### `Process`

`Process` 是某段 `Wisp` 的运行实例。每个 process 始终且仅属于一个 scope。

`ProcessRef<T>` 是 process 的控制面引用，并显式携带 `exitFuture`。

每个 process 在创建时带有只读 `ProcessDescriptor`。其中与完成判定相关的字段是：

```ts
type CompletionMode = "structural" | "detached";
```

- `structural`：参与所属 scope 的完成判定
- `detached`：不参与所属 scope 的完成判定

## Future、Context、Message

### `Future`

`FutureKey<T>` 与 `FutureSettleKey<T>` 共同标识一个单次收敛槽位：

- `FutureKey<T>` 只用于观察
- `FutureSettleKey<T>` 只用于收敛

future 的结果域固定为 `Either<FailureShape, T>`。因此：

- `wait(future)` 返回 `Either<FailureShape, T>`
- `poll(future)` 返回 `Option<Either<FailureShape, T>>`
- 同一个 future 可被多个等待者重复观察

owner scope 结束时，仍未完成的 future 会以 `canceled` 统一收束。

### `ContextKey`

`ContextKey<T>` 用于 scope 链上的绑定与查找。绑定在当前 scope 记录，查找沿祖先链可见。

### `MessageKey`

`MessageKey<T>` 用于 scope 内 mailbox 协议。

消息通道的语义是：

- scope-local
- FIFO
- 单条消息只投递给一个接收者

`send(scope, key, value)` 向目标 scope 追加消息，`receive(key)` 从当前 scope 读取消息；没有消息时阻塞。

## 失败

失败类型共有四类：

- `canceled`
- `external`
- `interrupted`
- `scope`

它们的语义分别是：

- `canceled`：取消路径导致的收敛
- `external`：外部异常或拒绝值被映射进失败结果
- `interrupted`：调度或治理中的带外错误打断了推进
- `scope`：scope 在 closing 阶段以结构性失败收敛

`ScopeFailure` 额外携带：

- `cause`：根因来自 process 或子 scope；其 `kind` 为 `process` 或 `scope`
- `suppressed`：收敛过程中附带捕获的其他 failure

`halt(failure)` 会让当前 process 以失败退出，并驱动所属 scope 按既有失败收敛规则进入关闭路径。

## 收敛

### Scope 生命周期

对外可观察的 scope 生命周期状态为：

- `open`
- `closing`
- `closed`

scope 会因为以下原因进入关闭路径：

- 结构性 process 全部退出
- 本地 process 失败
- 祖先取消级联
- 可传播的子 scope 失败上传

### `contain` 与 `propagate`

- `contain` 把失败和取消留在本边界内收敛
- `propagate` 把失败继续向祖先链上传

### cleanup

`defer(cleanup)` 把 cleanup ritual 注册到当前 process。process 退出后，运行时触发这些 cleanup。

多个 deferred cleanup 按注册顺序运行。

### 强制失败

除了由 process 发起的失败之外，运行时还支持把某个 scope 直接推进到失败收敛路径。强制失败会：

- 结束该 scope 内阻塞中的 process
- 收束该 scope 内仍未完成的 future
- 让该 scope 以给定失败结束

## 步进

最小执行模型是步进推进。对 runnable process 反复执行解释，单个步骤可能得到：

- `interpreted`
- `resonated`
- `ceded`
- `waiting`
- `exited`

`cede` 表示协作式让权，`waiting` 表示等待 future、message 或其他阻塞条件。

FIFO 队列是默认的最小调度闭环；更复杂的调度建立在这套语义之上。
