# Host 架构

本文档描述 host 的分层职责、与 kernel 的适配协议以及推进机制。

---

## 1. 分层

```
用户代码  ──yield*──▶  host（generator 编排 + 宿主桥接）
                            │
                  decodeRitual / encodeRitual
                            │
                      kernel（Wisp 解释 + Scope 树 + EventQueue）
```

- **kernel** 是执行语义单源：解释 Wisp、执行 sigil、维护 Scope 树与 Process 索引、推进可运行队列。
- **host** 负责将用户侧 generator 表达映射为 kernel 可执行 Wisp，并在宿主边界承载 `run`、`createScope`、`action`、`sleep`、`until` 等 API。

host 不引入第二执行循环，仅通过执行入口把降解后的 Ritual 提交给 kernel。

## 2. Ritual 适配协议

用户以 `RiteRoutine<T>`（generator function）书写流程，通过 `yield*` 组合原语。双向桥接由两个适配器完成：

| 适配器         | 方向          | 作用                                                                 |
| -------------- | ------------- | -------------------------------------------------------------------- |
| `encodeRitual` | kernel → host | 以 `Ritual<T>` 为入口，在 host 中按需编码为 `RiteCoroutine<T>`。     |
| `decodeRitual` | host → kernel | 以 `RiteRoutine<T>` 为入口，在 kernel 边界解码为可执行 `Ritual<T>`。 |

`RiteCoroutine<T>` 即 `Generator<Sigil, T, unknown>`；`RiteRoutine<T>` 即 `() => RiteCoroutine<T>`。适配入口统一为 ritual，而不是已实例化的 coroutine。

术语方向固定：`encode` = kernel → host（编码为宿主承载形态），`decode` = host → kernel（解码回 kernel ritual）。

## 3. 失败通道分层

kernel 以代数容器 `Either<Failure, T>` 在 primitive 层表达失败，保持可组合与可推理。host 在 primitive 适配边界统一解包：`Right` 直接返回成功值，`Left` 映射为宿主侧 `Error` 抛出。用户侧维持"成功返回值、失败抛异常"的标准模型。

`Failure`（kernel 共享失败契约）不向用户侧暴露；结构性 failure 在 host 侧映射为 `ShajaraError`（继承 `Error`）子类，`terminated` 映射为 `ScopeTerminatedError`；外部 failure 若携带原始 `Error`，则直接复用该实例。

因此 `run` / `wait` 与 `guard(entry, recover)` 的恢复回调在 external failure 上都尽量保留原始 `Error` 实例，以维持一致的 `instanceof` 识别语义；只有结构性 failure 才映射为 `ShajaraError` 子类。

## 4. 执行入口

host 以 `launch` 为统一收敛锚点：

1. 调用 `executor.launch(scope, ritual)` 获取 `LaunchHandle<T>`。
2. 通过 `handle.onSettled(...)` 观察单次 `LaunchResult<T>`（`success | failure | terminated`）并收敛为 Promise 语义。
3. 返回 `StatefulPromise<T>`（`PromiseLike<T>` + `state()`）。
4. 可选 `AbortSignal` 映射为 `executor.terminate(ref)`。

`run` 和 `createScope` 均通过 `launch` 实现。

## 5. 宿主桥接

`action`、`sleep`、`until` 等宿主操作在内部利用 future settlement capability 完成宿主回调到 kernel 的单次收敛闭环：

- host 侧创建 `FutureKey<T> / FutureSettleKey<T>` 对；其内部收敛结果固定为 `Either<Failure, T>`。
- kernel 侧通过 `wait(futureKey)` 等待收敛。
- 宿主回调通过 `executor.settle(futureSettleKey, result)` 注入最终结果。

宿主桥接通过 future settlement capability 完成单次收敛。消息协议由 kernel 的 `MessageKey` 语义承载；`Scope`、并发与结果收敛在 host 公开 API 中分别落在 `createScope`、`spawn` 与 future 相关原语上。

## 6. Scope 引用类型

host 与 kernel 的契约中，`Scope` 及其相关引用类型承载运行边界。

host 直接消费 kernel 导出的引用类型，不重复定义同语义包装：

| 类型                | 来源   | 用途                    |
| ------------------- | ------ | ----------------------- |
| `ScopeRef`          | kernel | 结构层引用              |
| `ExecutionScopeRef` | kernel | 执行入口引用（含 root） |
| `SelfHandle`        | kernel | 自省信息                |

命名规则：角色用 `*Scope`，控制面句柄用 `*Ref`。

## 7. 内核索引

运行期索引由 kernel 维护：Scope 树（父子关系与状态）、Process 表（当前 Wisp、退出信息与等待者）、等待登记（Receive、Wait，包括对 `scopeRef.exitFuture` / `processRef.exitFuture` 的观察），以及各 Scope 上按 MessageKey 令牌分组的消息队列与等待者登记。host 仅消费这些能力，不复制维护状态机。
