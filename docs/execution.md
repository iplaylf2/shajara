# 实现状态

当前阶段：**Build — Make it work**。

---

## 1. 当前目标与阻塞

当前主目标仍是打通可运行闭环：落地 kernel 执行器并接通 runtime 宿主入口。

- 主阻塞：`ensureExecutor()` 仍为占位实现，端到端运行闭环未建立。  
  证据：`packages/kernel/src/ensure-executor.ts`

## 2. 当前已落地状态（Build 相关）

- 终态与失败通道已统一：`AwaitScopeExit` 为 `completed/failed/terminated` 三态，kernel primitive 以 `Either<Failure, T>` 承载失败，runtime 在边界统一映射为异常。  
  证据：`docs/semantics.md` §5.3、§6.2；`docs/runtime.md` §3
- `spawn` 的恢复委派模式与 runtime 适配已落地。  
  证据：`packages/kernel/src/primitives/spawn.ts`；`packages/runtime/src/primitives/spawn.ts`
- 治理角色已统一为 `GovernorScope`，并通过 capabilities 显式表达 scheduler/reaper/full 组合。  
  证据：`docs/semantics.md` §1.3、§5.1；`packages/kernel/src/scopes/governor.ts`
- `send/receive/channel` 已在 kernel/runtime 对齐，并有 example 场景覆盖。  
  证据：`packages/kernel/src/primitives/send.ts`、`packages/kernel/src/primitives/receive.ts`、`packages/runtime/src/primitives/send.ts`、`packages/runtime/src/primitives/receive.ts`、`apps/example/src/scenarios.ts`

## 3. 相对设计基线的新增增量

- 失败术语统一为 `Failure/failed`，不再使用 `fault` 命名。  
  影响：失败对象、失败终态、halt 载荷命名在契约与语义文档保持一致。  
  证据：`packages/kernel/src/contracts/process.ts`、`packages/kernel/src/contracts/scope.ts`、`packages/kernel/src/syscalls/halt.ts`、`docs/semantics.md`
- 文档语义不再使用额外术语框架，统一改为“终态传播/收敛”描述。  
  影响：失败语义由 Scope 角色策略直接定义，避免双重术语层。  
  证据：`docs/semantics.md` §1.2、§1.3、§3.5、§6.4

## 4. 下一步（Build 聚焦）

1. 落地 `ensureExecutor()`，形成可运行的 kernel 执行器。
2. 接通 `run/createScope` 到真实执行器，完成 success/failure/terminated 端到端收敛。
3. 在执行器中补齐 Governor handler 触发、输入校验与返回值消费接线。

## 5. 验证基线

```sh
yarn build
yarn typecheck
yarn lint
```

当前与本次文档同步相关的类型验证已通过：

- `yarn workspace @khora/kernel run typecheck`
- `yarn workspace @khora/runtime run typecheck`
- `yarn workspace @khora/example run typecheck`
