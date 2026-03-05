# Runtime 架构

本文档描述 runtime 的分层职责、与 kernel 的适配协议以及推进机制。

---

## 1. 分层

```
用户代码  ──yield*──▶  runtime（generator 编排 + 宿主桥接）
                            │
                  lowerBlueprint / liftBlueprint
                            │
                      kernel（Plan 解释 + Scope 树 + EventQueue）
```

- **kernel** 是执行语义单源：解释 Plan、执行 syscall、维护 Scope 树与 Process 索引、推进可运行队列。
- **runtime** 负责将用户侧 generator 表达映射为 kernel 可执行 Plan，并在宿主边界承载 `run`、`createScope`、`action`、`sleep`、`until` 等 API。

runtime 不引入第二执行循环，仅通过执行入口把降解后的 Blueprint 提交给 kernel。

## 2. Blueprint 适配协议

用户以 `RuntimeBlueprint<T>`（generator function）书写流程，通过 `yield*` 组合原语。双向桥接由两个适配器完成：

| 适配器           | 方向             | 作用                                                                         |
| ---------------- | ---------------- | ---------------------------------------------------------------------------- |
| `liftBlueprint`  | kernel → runtime | 以 `Blueprint<T>` 为入口，在 runtime 中按需提升为 `RuntimePlan<T>`。         |
| `lowerBlueprint` | runtime → kernel | 以 `RuntimeBlueprint<T>` 为入口，在 kernel 边界降解为可执行 `Blueprint<T>`。 |

`RuntimePlan<T>` 即 `Generator<Syscall, T, unknown>`；`RuntimeBlueprint<T>` 即 `() => RuntimePlan<T>`。适配入口统一为 blueprint，而不是已实例化的 plan。

术语方向固定：`lift` = kernel → runtime（上升到编排层），`lower` = runtime → kernel（下降到执行层）。

## 3. 失败通道分层

kernel 以代数容器 `Either<Failure, T>` 在 primitive 层表达失败，保持可组合与可推理。runtime 在 primitive 适配边界统一解包：`Right` 直接返回成功值，`Left` 映射为 `KhoraError` 抛出。用户侧维持"成功返回值、失败抛异常"的标准模型。

`Failure`（kernel 共享失败契约）不向用户侧暴露；runtime 将其包装为 `KhoraError`（继承 `Error`），`terminated` 映射为 `ScopeTerminatedError`。

## 4. 执行入口

runtime 以 `launch` 为统一收敛锚点：

1. 调用 `executor.launch(scope, blueprint)` 获取 `LaunchHandle<T>`。
2. 将 `LaunchResult<T>`（`success | failure | terminated`）收敛为 Promise 语义。
3. 返回 `StatefulPromise<T>`（`PromiseLike<T>` + `state()`）。
4. 可选 `AbortSignal` 映射为 `executor.terminate(ref)`。

`run` 和 `createScope` 均通过 `launch` 实现。

## 5. 宿主桥接

`action`、`sleep`、`until` 等宿主操作在内部利用 `Channel<T>` 令牌完成宿主回调到 kernel 的消息投递闭环：

- 模块级创建 `Channel<T>` 令牌。
- runtime 内部通过 `executor.send(scope, channel, value)` 注入宿主输入。
- kernel 侧由 `receive(channel)` 等待并收敛。

同一套 `send/receive/channel` 也作为 runtime 编排原语对用户暴露，宿主桥接路径仍由 runtime 内部封装。

## 6. 边界引用类型

runtime 直接消费 kernel 导出的引用类型，不重复定义同语义包装：

| 类型                          | 来源   | 用途                     |
| ----------------------------- | ------ | ------------------------ |
| `ScopeRef`                    | kernel | 结构层引用               |
| `ExecutionScopeRootRef`       | kernel | 执行入口 root 锚点       |
| `ExecutionScopeRef`           | kernel | 执行入口 launch 返回引用 |
| `SelfDescriptor`              | kernel | 自省信息                 |
| `SpawnRef`（SpawnDescriptor） | kernel | 编排侧子作用域引用       |

命名规则：角色用 `*Scope`，控制面句柄用 `*Ref`。

## 7. 内核索引

运行期索引由 kernel 维护：Scope 树（父子关系与状态）、Process 表（当前 Plan、退出信息与等待者）、等待登记（Receive、AwaitScope，以及待定的 AwaitProcess），以及各 Scope 上按 Channel 令牌分组的消息队列与等待者登记。runtime 仅消费这些能力，不复制维护状态机。
