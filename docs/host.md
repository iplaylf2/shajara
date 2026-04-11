# Host 架构

本文档描述 host 的分层职责、适配协议以及推进机制。

---

## 1. 分层

```
用户代码  ──yield*──▶  host（generator 编排 + 宿主桥接）
                            │
                  decodeRitual / encodeRitual
                            │
                      kernel（Wisp 解释 + Scope 树 + EventQueue）
```

- **kernel** 提供执行语义。
- **host** 负责将用户侧 generator 表达映射为可执行 Wisp，并在宿主边界承载 `run`、`createScope`、`action`、`sleep`、`until` 等 API。
- **host** 同时承担 executor 的宿主侧接线：通过 `host/src/executor/` 组织 `ensureExecutor`、`Pacer` 适配与任务投递器，并以 `createExecutor(pacer)` 创建并持有 executor 实例（executor 语义参见 [executor.md](executor.md)）。

host 通过执行入口把降解后的 Ritual 提交给 executor。

## 2. Ritual 适配协议

用户以 `RiteRoutine<T>`（generator function）书写流程，通过 `yield*` 组合原语。双向桥接由两个适配器完成：

| 适配器         | 方向          | 作用                                                                 |
| -------------- | ------------- | -------------------------------------------------------------------- |
| `encodeRitual` | kernel → host | 以 `Ritual<T>` 为入口，在 host 中按需编码为 `RiteCoroutine<T>`。     |
| `decodeRitual` | host → kernel | 以 `RiteRoutine<T>` 为入口，在 kernel 边界解码为可执行 `Ritual<T>`。 |

`RiteCoroutine<T>` 即 `Generator<Sigil, T, unknown>`；`RiteRoutine<T>` 即 `() => RiteCoroutine<T>`。适配入口统一采用 ritual。

术语方向固定：`encode` = kernel → host（编码为宿主承载形态），`decode` = host → kernel（解码回 kernel ritual）。

## 3. 失败通道分层

kernel 以代数容器 `Either<Failure, T>` 在 primitive 层表达失败，保持可组合与可推理。host 在 primitive 适配边界统一解包：`Right` 直接返回成功值，`Left` 映射为宿主侧 `Error` 抛出。用户侧得到“成功返回值、失败抛异常”的模型。

`Failure`（kernel 共享失败契约）不向用户侧暴露；结构性 failure 在 host 侧映射为 `ShajaraError`（继承 `Error`）子类，`canceled` 映射为 `CanceledError`；外部 failure 若携带原始 `Error`，则直接复用该实例。

需要特别注意的是：只要某个外部异常已经驱动其所属 Scope 进入 failed 收敛，host 对外看到的就不再只是“原始异常”，而是“该 Scope 以该异常为根因失败”这一结构性事实。因此 `run` / `wait` / `enclose` 在面对 scope failure 时返回 `ScopeError` 是刻意的边界语义，不是额外包装造成的信息丢失。

读取这类失败时，约定如下：

- `ScopeError` 表示一个 Scope 已经以失败路径收敛。
- 根因始终位于 `scopeError.cause.failure`。
- 若根因是 external failure，原始 `Error` 位于 `scopeError.cause.failure.raw`。
- `scopeError.suppressed` 仅表示收敛期间额外捕获到的其他 failure；它不是原始异常链，也不会在单一根因失败时出现内容。

因此 `run` / `wait` 只会在 failure 尚未提升为 scope failure 时直接保留原始 `Error` 实例，以维持一致的 `instanceof` 识别语义；一旦失败已经形成 Scope 收敛事实，对外就稳定表现为 `ScopeError`。`guard(entry, recover)` 的恢复回调也固定接收 `ScopeError`，以便恢复逻辑面对的是显式的 Scope 边界，而不只是某个脱离上下文的原始异常。

## 4. 执行入口

host 以 `launch` 为统一收敛锚点：

1. 调用 `executor.launch(scope, ritual)` 获取 `LaunchHandle<T>`。
2. 通过 `handle.onSettled(...)` 观察单次 `LaunchResult<T>`（`success | failure | canceled`）并收敛为 Promise 语义。
3. 返回 `StatefulPromise<T>`（`PromiseLike<T>` + `state()`）。
4. 可选 `AbortSignal` 映射为 `executor.cancel(handle.scope)`。

`run` 和 `createScope` 均通过 `launch` 实现。

## 5. 宿主桥接

`action`、`sleep`、`until` 等宿主操作在内部利用 future settlement capability 完成宿主回调到 kernel 的单次收敛闭环：

- host 侧创建 `FutureKey<T> / FutureSettleKey<T>` 对；其内部收敛结果固定为 `Either<Failure, T>`。
- kernel 侧通过 `wait(futureKey)` 等待收敛。
- 宿主回调通过 `executor.settle(futureSettleKey, result)` 注入最终结果。

`Scope`、并发与结果收敛在 host 公开 API 中分别落在 `createScope`、`spawn` 与 future 相关原语上。

`autonomy` 也落在这一层适配责任中：host 直接复用 kernel 提供的 autonomy primitive，并对 `options.reaper` 做宿主侧转译，使其保持“正常返回表示继续等待、抛异常表示强制失败”的 host 风格失败通道。

## 6. Scope 引用类型

host 与 kernel 的契约中，`Scope` 及其相关引用类型承载运行边界。

host 直接消费 kernel 与 executor 导出的引用类型：

| 类型                | 来源     | 用途                    |
| ------------------- | -------- | ----------------------- |
| `ScopeRef`          | kernel   | 结构层引用              |
| `ExecutionScopeRef` | executor | 执行入口引用（含 root） |
| `SelfHandle`        | kernel   | 自省信息                |

命名规则：角色用 `*Scope`，控制面句柄用 `*Ref`。

## 7. 运行时状态

host 不维护 Scope 树、Process 表或等待登记；这些运行时状态由 kernel 与 executor 承接。host 只消费它们暴露出的能力边界。
