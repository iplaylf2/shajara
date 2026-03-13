# shajara

shajara 由两层构成：

- **`@shajara/kernel`** — 纯代数执行内核，以 `Wisp`（free monad over `Sigil`）为承载面，定义 Scope 树、Process 生命周期与 sigil 协议。
- **`@shajara/host`** — 面向用户的 generator 编排层，桥接 kernel 语义并提供宿主 API（`run`、`createScope`、`action`、`sleep`、`until`）。

## 文档索引

| 文档                                                           | 职责                                                               |
| -------------------------------------------------------------- | ------------------------------------------------------------------ |
| [semantics.md](semantics.md)                                   | kernel 语义单源：核心语义、对象模型、执行循环、收敛与 sigil 协议。 |
| [host.md](host.md)                                             | host 分层架构与 kernel 适配协议。                                  |
| [api.md](api.md)                                               | 用户侧公开 API 与使用约束。                                        |
| [implementation-constraints.md](implementation-constraints.md) | 实现期约束、命名治理与结构落位。                                   |
| [execution.md](execution.md)                                   | 当前实现状态快照。                                                 |

## 建议阅读顺序

按概念引入顺序阅读时，建议：

1. `api.md`：先建立用户侧 API、边界与原语的使用模型。
2. `semantics.md`：再查看 Scope、future、消息、执行循环与 primitive 语义定义。
3. `host.md`：最后查看 host 如何桥接 API 与 kernel 语义。

`implementation-constraints.md` 与 `execution.md` 分别用于实现约束和当前迭代状态，可在需要时单独查阅。

## 语义单源

每个概念只在一处文档定义，其余文档仅引用：

- `wisp / sigil / echo / resonance / relic / ritual` 这一组核心语义、Scope 角色、sigil 语义、执行循环 → `semantics.md`
- host 层架构与适配方向 → `host.md`
- 用户可见 API 形状 → `api.md`
- 实现期约束 → `implementation-constraints.md`
- `MessageKey` 的 mailbox 协议语义，以及 `FutureKey / FutureSettleKey` 的单次收敛语义 → `semantics.md`
