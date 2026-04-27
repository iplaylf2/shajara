# Explorer Example Design

本文档规划 `@shajara/docs` 的 explorer 动画示例集合。它说明哪些概念值得做成动画、示例之间如何排序，以及示例作者应如何命名、叙述和实现这些动画。具体代码仍以 `apps/docs/src/domain/explorer/examples` 为准。

## Design Goal

Explorer 的示例图解 shajara 边界内的并发编排关系，而不是替代 API reference 解释接口用途。它关注的是多个 process、future、scope、channel、failure 和 cancellation 如何在同一个运行世界中互相影响；API 名称只是读者进入这些关系的入口，不是示例存在的理由。

因此，解决宿主边界或适配问题的 API 通常不具备单独图解价值。`run`、`createScope`、`sleep`、`until`、`action` 这类接口可以出现在示例外壳或触发条件里，但不应该成为 explorer 示例本身。它们的语义可以由 shajara 边界内的 future、scope、channel、failure 和 cancellation 关系覆盖，只是少了一层宿主适配。

这也意味着 explorer 不需要覆盖所有公开 API。只有当一个概念在静态文档中很难说明其时间关系、所有权关系或收敛关系时，它才值得动画化。Single Spawn、Future Settlement 和 Scope Ownership 建立基础运行语言，后续示例在这个基础上展开组合、通信、收束和治理关系。

## Ordering Logic

示例顺序遵循四个层次：

1. **基本编排关系**：先解释 spawned process、future、wait、scope 如何形成可观察的运行关系。
2. **结构化并发关系**：随后展示 fork join、all、race 等关系如何把多个流程组织成一棵运行树。
3. **显式通信关系**：再进入 channel，展示值传递、节奏控制和通信对象生命周期。
4. **收束与治理关系**：最后展示 cleanup、cancellation、failure、recovery、resource、autonomy 这些决定系统如何结束、恢复或被治理的机制。

## Example Sequence

| Order | Example               | What It Shows                                                                                | Why It Exists                                                                                                                              |
| ----- | --------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 1     | Single Spawn          | 一个 process 发起独立工作，随后返回自己的结果；spawned process 继续运行并结算自己的 future。 | 这是最小的边界内并发关系。它把 spawn 发起关系、future 和结果独立收敛串起来，让发起者结果和 spawned process future 各自保持独立。           |
| 2     | Future Settlement     | 一个 process 创建并等待 future，另一个 process 稍后结算它，等待者读取结果并继续。            | future 是 `spawn`、`all`、`race`、resource 和外部输入共同使用的收敛对象。单独展示它可以把“结果收敛”作为独立主题呈现。                      |
| 3     | Scope Ownership       | 外层流程进入一个 child scope；child scope 产生结果后仍会等待边界内拥有的工作完成。           | scope 是 shajara 的结构化并发边界。这个示例说明边界内的所有权、完成和收敛，不需要依赖 `run` 或 `createScope` 这类宿主入口。                |
| 4     | Fork Join             | 一个 process 启动多个并发分支，并在汇合点等待所有需要的结果。                                | 这是最经典的结构化并发图形：多个并发 process 展开，结果在明确位置汇合。它为 `all` 与 `race` 提供组合并发的对照基线。                       |
| 5     | All Results           | 多个分支并发发起，并把各自结果聚合到一个组合 future。                                        | `all` 的价值不只是“同时跑多个任务”，而是把一组分支表达为一个整体等待点。这个示例展示多个并发分支如何汇成一个聚合结果。                     |
| 6     | First Result          | 多个分支竞争同一个结果，最先完成者决定最终值，其余流程随 arena 收束。                        | `race` 是 fork join 的对照：不是所有结果都需要被消费。它说明 shajara 可以表达“第一个结果足够”的并发意图，并仍然维持结构化收束。            |
| 7     | Rendezvous Channel    | 一个发送者和一个接收者在无缓冲 channel 上相遇后同时继续。                                    | channel 是流程之间传递值的显式通信对象。无缓冲通信最容易动画化“发送和接收互相等待”的关系。                                                 |
| 8     | Buffered Backpressure | 有界 channel 接收若干值，缓冲满后发送者等待，直到接收者消费。                                | backpressure 是 channel 相比 future 更重要的表达能力。这个示例解释容量不是配置细节，而是流程之间的节奏关系。                               |
| 9     | Channel Termination   | channel 被显式关闭或因 owning scope 结束而撤销，等待中的发送者和接收者被唤醒。               | close 与 revoke 是理解 channel 生命周期的关键。这个示例说明通信对象也受 scope 所有权管理，不是无主的队列。                                 |
| 10    | Deferred Cleanup      | 流程注册 cleanup，主流程结束或被取消后 cleanup 依次运行。                                    | `defer` 是生命周期收束的入口。它让读者看见“完成”不是简单消失，而是有可观察的清理阶段。                                                     |
| 11    | Cancellation Cascade  | scope 内的取消使等待中的流程、future 和并发 process 沿 scope 结构收敛为 canceled。           | cancellation 是结构化并发最需要动画解释的部分之一。它展示取消不是单点事件，而是沿 scope ownership 传播并最终收束。                         |
| 12    | Failure Propagation   | 一个 process 失败后，失败沿 scope 规则影响所在边界，或被 contain 边界截断。                  | failure 是 cancellation 的对照。这个示例解释 `propagate` 和 `contain` 的存在意义：不是所有失败都应该毁掉整棵树，也不是所有失败都能被忽略。 |
| 13    | Guarded Recovery      | 一个 resumable process 失败后，把恢复请求交给 guard 边界，恢复值使等待流程继续。             | recovery 是 shajara 区别于普通 try/catch 的高级能力：失败被结构化地转交给恢复边界，而不是在任意位置逃逸。                                  |
| 14    | Scoped Resource       | resource provider 暴露一个 ready value 后保持挂起，直到 owning scope 收束时完成清理。        | resource 适合展示“可用值”和“生命周期所有权”分离。读者会看到资源不是一次性 Promise，而是被 scope 持有和释放的长期对象。                     |
| 15    | Autonomous Scheduling | autonomous scope 把可运行 process 交给 scheduler 分配。                                      | scheduler 是从常规边界内编排走向高级执行治理的第一步。这个示例展示“谁来推进 process”可以被治理，而不改变 scope 的核心语义。                |
| 16    | Reaper Adjudication   | 一个 closing scope 无法自然收敛时，reaper 决定继续等待或提交失败裁决。                       | reaper 是 explorer 的最高阶示例。它解释 autonomy 不是装饰性的调度钩子，而是 closing 状态下的治理机制。                                     |

## Narrative Groups

### Foundation

Examples 1-3 建立 explorer 的基础语言：spawn、future、wait、scope。它们应该保持短小，重点是让读者理解“边界内的编排关系由谁发起、等待谁、把结果收敛到哪里”。Foundation 示例尤其要避免把宿主入口当成主题；它们应直接展示 shajara 运行世界内部的对象关系。

### Structured Concurrency

Examples 4-6 展示流程树如何分叉、组合和竞争。Fork Join 展示多个 spawned process 如何在明确位置汇合，并为 `all` 与 `race` 提供对照基线。

### Communication

Examples 7-9 专门讲 channel。channel 不应夹在 fork join 内顺带说明，因为它表达的是流程之间的值传递、节奏控制和通信对象生命周期。

### Lifecycle

Examples 10-14 讲系统如何结束：cleanup、cancellation、failure、recovery、resource。它们共同回答“当事情不只是成功返回时，运行树如何保持可解释”。

### Governance

Examples 15-16 放在最后。scheduler 和 reaper 需要读者已经理解 process runnable、scope closing、failure convergence。它们是 explorer 的高级章节。

## Naming And Copy

示例标题应命名动画真正演出的关系，而不是命名某个 API、代码形状或中间实现。标题、example id、目录名、导出符号和 i18n key 应保持同一概念。改动主题时，应同步这些命名层级，避免实现结构和读者看到的标题表达不同概念。

业务函数名应帮助读者理解“谁在发起、谁在等待、谁在完成”。优先选择能表达实际动作的业务词，例如订单提交、短信接收、文章发布、索引更新。不要把 `scope`、`future`、`runtime` 这类 shajara 概念塞进业务函数名里，避免读者误以为业务动作是 API 或 runtime 概念。

标题下的短说明负责把示例标题拉入 shajara 术语体系。它应保持短而平，直接连接核心元素和动作。短说明不承载业务场景、长解释或概念总结，业务语境留给代码和 guide list。

Guide list 不固定行数。每条 guide 应承担一个明确职责：当前动画里的 process 做了什么、哪个运行对象拥有或等待哪个对象、结果在哪里收敛。基础概念第一次出现时可以单独占一条 guide。没有新概念需要铺垫时，也不必为了视觉对称补足固定数量。

Guide copy 应面向示例，而不是写成 API reference。它可以使用示例里的业务名和必要的 shajara 术语，但不应把一条句子写成“动作；解释”的拼接。中文文案中标点应自然服务阅读，不用分号承载硬切换。

## Animation Language

Explorer 的演出逻辑帮助读者区分“正在执行的 process”“被等待的 future 或 process”和“已经完成的结果”。下面的图形语言适用于所有示例：

- 初始帧属于 pending 状态。正式动画开始后，cursor 才进入具体 process 的运行位置。
- cursor 表示 process 当前停留的位置。process 完成后，completed state 承接完成表达。
- 带箭头的顺序实线表示 coroutine 块之间的推进方向。一个 process 发起 spawn 时，这条线从发起块指向新创建的 process 块。
- 虚线表示 routine 块之间正在发生的等待关系。等待期间，虚线从被等待的一侧指向被阻塞的一侧。
- 等待完成后留下的浅色实线属于等待轨迹。它表示这段等待关系已经被结算，和带箭头的顺序实线不是同一种关系。
- 正向启动线和反向等待线不应在同一个事件上同时点亮。`spawn-*` 事件只表达创建方向；等待关系应使用独立的 `wait-*`、`scope-wait` 或同类事件。
- 如果等待关系没有对应的代码行，可以使用只服务 flow 的内部事件。内部事件可以出现在 cursor 的事件集合里，用来点亮等待线，但不需要伪造一行代码。
- Fork Join 等待的是 spawned process 本身的 future，spawned process 节点已经表达等待对象，虚线只承载 routine 间的等待关系。
- Future Settlement 等待的是 `smsCode` 这个独立 future，虚线上的 `smsCode` label 承担等待目标的命名。
- Scope Ownership 等待的是 child scope 拥有的 spawned process。外层 cursor 可以停在 `enclose` 行，反向等待线使用内部等待事件表达 `enclose` 仍在等待 owned work。

## Runtime Authoring Rules

Explorer runtime 是可执行的示例代码，不是动画脚本的自由容器。动画事件应贴在真实代码动作旁边，不能牺牲代码卫生。

- `emit` 前后应有真实代码推进，或把多个状态变化合并到同一个 `emit` 中。不要出现连续 `emit` 只是为了分帧。
- 不要为了动画完成事件包一层没有业务语义的 `try` / `finally`。如果代码没有 `return`、cleanup、异常边界或资源保护语义，操作完成后直接 `emit`。
- 当动画需要在 `return` 发生后标记完成时，可以使用 `try` / `finally` 让完成事件绑定到返回点。此时 `finally` 表达的是返回语义的收尾，而不是单纯的动画延迟。
- 代码示例中的控制流应优先服务读者理解。当一个操作同时承担等待和返回两个叙事动作时，可以拆成中间变量和显式返回，让两个阶段在代码回放里都清楚可见。
- 代码行 id、flow event 和 node lifecycle 应共同表达同一个概念。事件命名应服务动画语义，不应为了复用某个代码行 id 而模糊启动、等待或完成关系。

## Inclusion Criteria

一个 explorer 示例值得动画化，应满足至少一个条件：

- 它展示了两个或多个运行对象之间的时间关系。
- 它展示了 scope ownership 如何影响结果、取消、失败或资源释放。
- 它展示了边界内语义中难以靠静态代码解释清楚的编排关系。
- 它能为后续示例提供一个必要的概念台阶。

反过来，只展示返回值形状、类型签名、普通同步控制流，或只体现宿主边界适配便利性的内容，不应单独做成 explorer 动画。它们更适合放在 reference 或 guide 文档中。
