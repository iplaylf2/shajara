# 实现状态

当前阶段：**Build — Make it work**。

---

## 当前焦点

当前要收口的问题是：`RuntimeScope` 的运行时接线不应继续通过 `observeRunnable(...)` 暴露为外部接口，而应进入 `RuntimeScope` 自身的构造契约。

这条收口现在采用 `runtime zone` 作为工作概念：

- 根 scope 在 `create(...)` 时显式承接 zone
- child scope 在 `branch(...)` 时默认继承父 zone，也允许显式换入新 zone
- `spawn(...)` 只在当前 scope 既有 zone 下创建 process，不形成新的 zone 边界

---

## 当前偏差

当前实现与这一焦点之间的偏差只有两条：

1. `Interpreter.observeRunnable(...)` 与 `RuntimeScope.observeRunnable(...)` 仍然存在于代码中。  
   证据：`packages/kernel/src/interpreter/interpreter.ts`、`packages/kernel/src/interpreter/runtime-scope.ts`

2. `RuntimeScope` 的 `create(...)` / constructor / `branch(...)` 还没有承接 `runtime zone`。  
   证据：`packages/kernel/src/interpreter/runtime-scope.ts`

---

## 下一步

1. 从 `Interpreter` 与 `RuntimeScope` 中移除 `observeRunnable(...)` 及其相关类型。
2. 重写 `RuntimeScope` 的构造契约，使 `runtime zone` 进入 `create(...)`、constructor 与 `branch(...)`。
3. 明确 `spawn(...)` 只消费当前 scope 已持有的 zone。
4. 在设计文档中同步收口这一变化，并清理 `interpreter.md`、`executor.md` 中围绕 `observeRunnable` 的旧描述。

---

## 验证

建议验证命令：

```sh
yarn workspace @shajara/kernel typecheck
yarn workspace @shajara/kernel lint
```
