# 实现状态

当前阶段：**Ship — Make it shippable**。

---

## 当前主题

当前迭代的主题是同步 host 对 kernel executor 公共接口的适配，并清理文档里对 executor 表面的落后描述。

---

## 当前现实

当前仍然影响这一轮工作的事实只有这些：

- `@shajara/kernel` 的 executor 创建契约已经显式采用 `Pacer`：它由 `beginSlice()`、`continueLater(...)` 和 `Slice.shouldYield()` 组成，不再使用文档里旧的 `Scheduler/nextTick/isExhausted` 形状。  
  证据：`packages/kernel/src/executor/executor.ts`、`packages/kernel/src/executor/pacer.ts`
- host 侧 `ensureExecutor` 已迁入 `packages/host/src/executor/`，并拆成入口、`ShajaraPacer`、`TimeSlice`、`TaskPoster` 四个实现单元；`index.ts` 只负责向内部调用点重新导出 `ensureExecutor`。  
  证据：`packages/host/src/executor/index.ts`、`packages/host/src/executor/ensure-executor.ts`、`packages/host/src/executor/shajara-pacer.ts`、`packages/host/src/executor/time-slice.ts`、`packages/host/src/executor/task-poster.ts`
- host 的 `run`、`createScope`、`action`、`sleep`、`until` 现在统一经由 `#/executor` 读取同一个 `ensureExecutor` 入口，不再直接引用根级 `ensure-executor.ts` 文件。  
  证据：`packages/host/src/operations/run.ts`、`packages/host/src/operations/create-scope.ts`、`packages/host/src/operations/action.ts`、`packages/host/src/operations/sleep.ts`、`packages/host/src/operations/until.ts`
- `Executor` 当前把根执行入口公开为 `scope`，并通过继承 `LaunchHandle` 暴露 `status` / `onSettled`；host 的 `run`、`createScope` 已同步改为基于 `executor.scope` 启动根级 ritual。  
  证据：`packages/kernel/src/executor/executor.ts`、`packages/host/src/operations/run.ts`、`packages/host/src/operations/create-scope.ts`

---

## 当前偏差

当前最值得在下一轮继续处理的偏差有两条：

1. `host/src/executor/` 目前仍是轻量接线层：单例治理仍集中在 `ensureExecutor()` 中，尚未进一步抽成更明确的执行环境对象。  
   证据：`packages/host/src/executor/ensure-executor.ts`
2. executor 的公开表面已经稳定为 `scope/status/onSettled + launch/settle/cancel`，但其余文档仍需持续按这一表面对齐，避免再次回流旧的 `rootScope` 表述。  
   证据：`docs/executor.md`

---

## 相对设计基线的增量

- 相对现有文档基线，executor 的宿主调度桥接已经稳定为 `Pacer/Slice`，不再是 `Scheduler`。
- 相对上一版 host 实现，`ensureExecutor` 已从根目录单文件搬迁到 `host/src/executor/`，并按类职责拆成多个文件。
- 相对上一版 host 内部引用方式，宿主操作现在统一从 `#/executor` 进入内部 executor 接线入口。
- 相对上一版 executor 文档表面，根执行入口现在统一记为 `executor.scope`，而不是 `rootScope`。

---

## 下一步

1. 视实现复杂度决定是否把 host 侧 executor 单例治理从 `ensureExecutor()` 继续抽离为独立对象。
2. 在 executor 表面继续迭代时，同步维护设计文档和状态文档，避免 host 适配与文档再次脱节。
3. 围绕现有 executor 行为继续补运行与行为验证。

---

## 验证

当前可复现的检查命令：

```sh
yarn build
yarn typecheck
yarn workspace @shajara/host test
```
