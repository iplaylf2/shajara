# 执行环境

执行环境建立在基础语义之上。

## 对象职责

`Executor` 是长期存在的执行环境对象。它提供：

- 一个稳定的根执行入口
- 启动新入口 `ritual` 的能力
- 从宿主侧注入 `future` 结果的能力
- 从宿主侧取消执行入口 scope 的能力

创建入口：

```ts
const executor = createExecutor(pacer);
```

## 执行入口

executor 在 `ScopeRef` 之上引入 `ExecutionScopeRef`。

它不是新的语义对象，而是“可作为执行入口与外部控制目标的 scope 引用”。`Executor` 注册并公开的，正是这类可 `launch`、可 `cancel` 的执行入口。

executor 自身公开一个长期根入口：

- `executor.scope`

后续所有入口启动都从某个 `ExecutionScopeRef` 出发。

## 启动入口

`Executor` 的核心接口是：

```ts
interface Executor extends LaunchHandle<never> {
  launch<Result>(
    scope: ExecutionScopeRef<unknown>,
    ritual: Ritual<Result>,
  ): Option<LaunchHandle<Result>>;

  settle<Result>(futureSettle: FutureSettleKey<Result>, result: FutureResult<Result>): boolean;

  cancel(scope: ExecutionScopeRef<unknown>): boolean;
}
```

`launch(...)` 的职责是：在指定 `ExecutionScopeRef` 下创建一段新的入口计算，并返回它的 `LaunchHandle`。

如果目标 scope 已不再合法或不再开放，则返回 `none`。

每次 `launch` 都先建立一个 `failureMode: "contain"` 的入口 scope，再在该边界内运行目标 `ritual`。`LaunchHandle.scope` 对应的就是这个入口 scope。

## 入口句柄

`LaunchHandle<Result>` 是 executor 暴露给外部的入口句柄：

```ts
interface LaunchHandle<Result> {
  readonly scope: ExecutionScopeRef<Result>;
  readonly status: "open" | "closing" | "closed";
  onSettled(listener: (result: LaunchResult<Result>) => void): Disposer;
}
```

它回答三件事：

- 这次 `launch` 对应哪个 `ExecutionScopeRef`
- 这个入口现在处于什么生命周期状态
- 这次入口最终如何收敛

`LaunchResult<Result>` 的结果域只有三种：

- `success`
- `failure`
- `canceled`

executor 自身也是根 scope 的 `LaunchHandle` 视图，因此同样公开 `status` 与 `onSettled(...)`。

## 外部注入

### `future` 收敛

`settle(futureSettle, result)` 负责从执行环境外部把结果写入运行中的 `future`。

- 返回 `true`：注入成功接入
- 返回 `false`：`future` 已经收敛，或当前环境无法再接入这次注入

### scope 取消

`cancel(scope)` 负责从执行环境外部请求取消某个执行入口 scope。

- 返回 `true`：取消请求被接入
- 返回 `false`：scope 非法、未注册，或已不再开放

## 切片推进

`Executor` 通过 `Pacer` 与宿主事件循环协作：

```ts
interface Pacer {
  beginSlice(): Slice;
  continueLater(work: () => void): Disposer;
}

interface Slice {
  shouldYield(): boolean;
}
```

- `beginSlice()` 开启一次新的同步切片
- `shouldYield()` 决定当前切片是否应让出线程
- `continueLater(work)` 把后续工作投递给宿主侧

## 自治治理

`autonomy` 是 `Executor` 对部分 scope 追加的治理能力。它不改写 `Scope` 的基本语义，只改变“这个 scope 由谁调度、何时需要额外回收仲裁”。

### `scheduler`

```ts
interface Scheduler {
  assign(process: ProcessRef<unknown>): Processor;
}
```

当自治 scope 下的 process 变为 runnable 时，`Executor` 调用 `scheduler.assign(process)`，把该 process 路由到某个 `Processor`。

这里 `ProcessRef` 表示调度目标。

### `reaper`

```ts
interface Reaper {
  adjudicate(scope: ScopeRef<unknown>): Wisp<Option<Failure>>;
}
```

当 `closing` scope 不能自然及时收敛时，`Executor` 可以把该 scope 提交给 `reaper` 仲裁：

- 返回 `none`：继续等待自然收敛
- 返回 `some(failure)`：以该 failure 对目标 scope 发起失败收敛

这里 reaper 处理的是治理决策。
