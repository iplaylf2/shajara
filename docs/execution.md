# 实现状态

当前阶段：**Ship — Make it shippable**。

---

## 当前主题

当前迭代的主题是把 host 侧 `ensureExecutor` 从单文件实现整理为稳定的内部模块边界，并同步修正文档对 executor 接口的落后描述。

---

## 当前现实

当前仍然影响这一轮工作的事实只有这些：

- `@shajara/kernel` 的 executor 创建契约已经显式采用 `Pacer`：它由 `beginSlice()`、`continueLater(...)` 和 `Slice.shouldYield()` 组成，不再使用文档里旧的 `Scheduler/nextTick/isExhausted` 形状。  
  证据：`packages/kernel/src/executor/create.ts`
- host 侧 `ensureExecutor` 已迁入 `packages/host/src/executor/`，并拆成入口、`ShajaraPacer`、`TimeSlice`、`TaskPoster` 四个实现单元；`index.ts` 只负责向内部调用点重新导出 `ensureExecutor`。  
  证据：`packages/host/src/executor/index.ts`、`packages/host/src/executor/ensure-executor.ts`、`packages/host/src/executor/shajara-pacer.ts`、`packages/host/src/executor/time-slice.ts`、`packages/host/src/executor/task-poster.ts`
- host 的 `run`、`createScope`、`action`、`sleep`、`until` 现在统一经由 `#/executor` 读取同一个 `ensureExecutor` 入口，不再直接引用根级 `ensure-executor.ts` 文件。  
  证据：`packages/host/src/operations/run.ts`、`packages/host/src/operations/create-scope.ts`、`packages/host/src/operations/action.ts`、`packages/host/src/operations/sleep.ts`、`packages/host/src/operations/until.ts`
- 这轮改动是结构重排和文档对齐，不是 executor 行为落地；`createExecutor(...)` 当前仍然返回 `notImplemented(...)`。  
  证据：`packages/kernel/src/executor/create.ts`

---

## 当前偏差

当前最值得在下一轮继续处理的偏差有两条：

1. `executor` 设计文档虽然已经改回 `Pacer` 语义，但 kernel 内部的 `createExecutor(...)` 仍未实现，当前 host 拆分只提供了宿主适配骨架。  
   证据：`packages/kernel/src/executor/create.ts`
2. `host/src/executor/` 目前仍是轻量接线层：单例治理仍集中在 `ensureExecutor()` 中，尚未进一步抽成更明确的执行环境对象。  
   证据：`packages/host/src/executor/ensure-executor.ts`

---

## 相对设计基线的增量

- 相对现有文档基线，executor 的宿主调度桥接已经稳定为 `Pacer/Slice`，不再是 `Scheduler`。
- 相对上一版 host 实现，`ensureExecutor` 已从根目录单文件搬迁到 `host/src/executor/`，并按类职责拆成多个文件。
- 相对上一版 host 内部引用方式，宿主操作现在统一从 `#/executor` 进入内部 executor 接线入口。

---

## 下一步

1. 继续实现 kernel 侧 `createExecutor(...)`，把当前 `Pacer` 契约真正接到解释器推进循环上。
2. 视实现复杂度决定是否把 host 侧 executor 单例治理从 `ensureExecutor()` 继续抽离为独立对象。
3. 在 executor 行为开始落地后，再补对应的运行与行为验证，而不只停留在结构整理。

---

## 验证

当前可复现的检查命令：

```sh
yarn --cwd packages/host run lint
yarn --cwd packages/host run typecheck
```
