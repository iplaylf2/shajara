# shajara

shajara 是结构化并发运行时，由两层构成：

- **`@shajara/kernel`** — 纯代数执行内核，以 `Wisp`（free monad over `Sigil`）为承载面，定义 Scope 树、Process 生命周期与 sigil 协议。
- **`@shajara/host`** — 面向用户的 generator 编排层，桥接 kernel 语义并提供宿主 API（`run`、`createScope`、`action`、`sleep`、`until`）。

## 文档索引

| 文档                                           | 职责                                                      |
| ---------------------------------------------- | --------------------------------------------------------- |
| [semantics.md](semantics.md)                   | kernel 执行语义：对象模型、执行循环、收敛、sigil 协议。   |
| [host.md](host.md)                             | host 分层架构与 kernel 适配协议。                         |
| [api.md](api.md)                               | 用户侧公开 API 与使用约束。                               |
| [design-constraints.md](design-constraints.md) | 跨层稳定约束与命名规则。                                  |
| [execution.md](execution.md)                   | 当前实现状态快照。                                        |

## 语义单源

每个概念只在一处文档定义，其余文档仅引用：

- Scope 角色、sigil 语义、执行循环 → `semantics.md`
- host 层架构与适配方向 → `host.md`
- 用户可见 API 形状 → `api.md`
- 跨层约束 → `design-constraints.md`
