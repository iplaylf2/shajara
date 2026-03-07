# 实现状态

当前阶段：**Build — Make it work**。

---

## 1. 当前目标与阻塞

当前主目标仍是打通可运行闭环：落地 kernel 执行器并接通 host 宿主入口。

- 主阻塞：`ensureExecutor()` 仍为占位实现，端到端运行闭环未建立。  
  证据：`packages/kernel/src/executor.ts`

## 2. 当前已落地状态（Build 相关）

- `AwaitProcess` sigil 声明已落地，Process 终态观察与 `AwaitScope` 并列存在。  
  证据：`packages/kernel/src/syscalls/await-process.ts`、`packages/kernel/src/sigils.ts`
- `all` 分支并发已改为 `Fork + AwaitProcess(in-band)`，外层 supervisor 仍通过 `awaitScopeConverged` 收敛整体结果。  
  证据：`packages/kernel/src/primitives/all.ts`、`packages/kernel/src/primitives-kit/await-process-in-band.ts`
- `race` arena 内部分支已改为 `Fork`；分支完成后 `Send(raceChannel)` 并 `Halt`，arena 根 process 通过 `park` 挂起等待收敛路径。  
  证据：`packages/kernel/src/primitives/race.ts`、`packages/kernel/src/primitives-kit/park.ts`
- host `race` 入参已收敛为非空 tuple，禁止空分支调用。  
  证据：`packages/runtime/src/primitives/race.ts`

## 3. 相对设计基线的新增增量

- `AwaitProcess` 从“待定概念”转为已声明 sigil。  
  影响：Process 级等待进入可组合 sigil 面，`all` 等组合 primitive 可直接依赖 Process 终态观察。  
  证据：`packages/kernel/src/syscalls/await-process.ts`、`docs/semantics.md` §5.3、`docs/design-constraints.md` §3
- `all/race` 的分支执行单元从“branch 子 Scope”转为“branch Process”。  
  影响：并发构造 primitive 内部可以直接组合 `Fork`；最终失败仍由外层 supervisor 收敛。  
  证据：`packages/kernel/src/primitives/all.ts`、`packages/kernel/src/primitives/race.ts`、`docs/semantics.md` §6.3
- `race` 增加非空分支约束。  
  影响：空分支语义不再是运行时分支问题，而是类型层面的调用前约束。  
  证据：`packages/kernel/src/primitives/race.ts`、`packages/runtime/src/primitives/race.ts`、`docs/api.md` §4.1

## 4. 下一步（Build 聚焦）

1. 落地 `ensureExecutor()`，形成可运行的 kernel 执行器。
2. 接通 `run/createScope` 到真实执行器，完成 success/failure/terminated 端到端收敛。
3. 在执行器中补齐 `AwaitProcess` 的解释路径，并联调 `all/race` 新分支模型。

## 5. 验证基线

```sh
yarn build
yarn typecheck
yarn lint
```

当前与本次实现同步相关的验证已通过：

- `yarn workspace @shajara/kernel lint`
- `yarn workspace @shajara/kernel typecheck`
- `yarn workspace @shajara/host lint`
- `yarn workspace @shajara/host typecheck`
