# Explorer Example Design

Explorer 示例集合是一组渐进式视觉课程，用动画和代码片段展示 shajara 边界内的并发编排。示例从最小的 spawn、future、wait、scope 关系开始，逐步展开组合、通信、收束和治理关系。

## Design Goal

Explorer 的示例专注于 shajara 边界内的并发编排关系。它关注多个 process、future、scope、channel、failure 和 cancellation 如何在同一个运行世界中互相影响；API 名称作为读者进入这些关系的入口。

宿主边界或适配 API 适合出现在示例外壳或触发条件里。`run`、`createScope`、`sleep`、`until`、`action` 这类接口服务示例入口；示例主题由 shajara 边界内的 future、scope、channel、failure 和 cancellation 关系承载。

Explorer 选择静态文档难以说明的时间关系、所有权关系和收敛关系。Single Spawn、Future Settlement 和 Scope-Owned Work 建立基础运行语言，后续示例在这个基础上展开组合、通信、收束和治理关系。

## Ordering Logic

示例顺序遵循四个层次：

1. **基本编排关系**：先解释 spawned process、future、wait、scope 如何形成可观察的运行关系。
2. **结构化并发关系**：随后展示 fork join、all、race 如何把多份工作组织成有明确汇合或竞争意图的运行树。
3. **显式通信关系**：再进入 channel，展示值传递和节奏控制。
4. **收束与治理关系**：最后展示 scope-managed objects、cancellation、failure、recovery、resource、autonomy 如何决定系统的结束、恢复和治理方式。

## Example Sequence

示例序列承担如下概念职责。标题确定演出主题，说明确定叙事边界，具体业务故事由示例场景承载。

| Order | Example               | What It Shows                                                                                                            | Why It Exists                                                                                                                                                           |
| ----- | --------------------- | ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | Single Spawn          | 一个 process 发起独立工作，随后返回自己的结果；spawned process 继续运行并结算自己的 future。                             | 这是最小的边界内并发关系。它把 spawn 发起关系、future 和结果独立收敛串起来，让发起者结果和 spawned process future 各自保持独立。                                        |
| 2     | Future Settlement     | 一个 process 创建并等待 future，另一个 process 稍后结算它，等待者读取结果并继续。                                        | future 是 `spawn`、`all`、`race`、resource 和外部输入共同使用的收敛对象。单独展示它可以把“结果收敛”作为独立主题呈现。                                                   |
| 3     | Scope-Owned Work      | 外层流程进入一个 child scope；child scope 产生结果后仍会等待边界内拥有的工作完成。                                       | scope 是 shajara 的结构化并发边界。这个示例说明 scope-owned work 对完成和收敛的影响。                                                                                   |
| 4     | Fork Join             | 一个 process 启动多个并发 process，并在汇合点等待所有需要的结果。                                                        | 这是最经典的结构化并发图形：多个并发 process 展开，结果在明确位置汇合。它为 `all` 与 `race` 提供组合并发的对照基线。                                                    |
| 5     | All Results           | `all` 同时发起多份并发工作，并把全部结果聚合到一个组合 future。                                                          | 它把一组并发工作表达为一个整体等待点。示例重点是“全部结果共同结算”这个收敛关系。                                                                                        |
| 6     | First Result          | `race` 同时发起多份并发工作，并让首个完成结果成为竞争结果。                                                              | 它与 All Results 构成对照：首个结果足够推动流程继续。示例重点是竞争关系，以及剩余工作如何随结构化边界收束。                                                             |
| 7     | Bounded Channel       | 两个 process 通过有界 channel 传递值；缓冲被填满时发送者等待，缓冲为空时接收者等待。                                     | channel 是流程之间传递值的显式通信对象。容量决定发送和接收如何互相调节推进节奏。                                                                                        |
| 8     | Scope-Managed Objects | child scope 创建 future 和 channel，并把相应 handle 返回给外层流程；child scope 退出时自动收束这些仍由它拥有的运行对象。 | 它展示 future 和 channel 的生命周期由创建它们的 scope 管理；外层流程后续使用这些 handle 时，观察的是 child scope 已经完成的 future cancellation 和 channel revocation。 |
| 9     | Cancellation Cascade  | scope 内的取消使等待中的流程、future 和并发 process 沿 scope 结构收敛为 canceled。                                       | cancellation 是结构化并发最需要动画解释的部分之一。它展示取消沿 scope 结构传播并最终收束。                                                                              |
| 10    | Failure Propagation   | 一个 process 失败后，失败沿 scope 规则影响所在边界，或被 contain 边界截断。                                              | failure 是 cancellation 的对照。这个示例解释 `propagate` 和 `contain` 如何决定失败影响的边界。                                                                          |
| 11    | Guarded Recovery      | 一个 resumable process 失败后，把恢复请求交给 guard 边界，恢复值使等待流程继续。                                         | recovery 是 shajara 区别于普通 try/catch 的高级能力：失败被结构化地转交给恢复边界。                                                                                     |
| 12    | Scoped Resource       | resource provider 暴露一个 ready value 后保持挂起，直到 owning scope 收束时完成清理。                                    | resource 适合展示“可用值”和“生命周期所有权”分离。读者会看到资源作为被 scope 持有和释放的长期对象。                                                                      |
| 13    | Autonomous Scheduling | autonomous scope 把可运行 process 交给 scheduler 分配。                                                                  | scheduler 是从常规边界内编排走向高级执行治理的第一步。这个示例展示“谁来推进 process”可以在保持 scope 核心语义的前提下被治理。                                           |
| 14    | Reaper Adjudication   | 一个 closing scope 持续停留在 closing 状态时，reaper 决定继续等待或提交失败裁决。                                        | reaper 是 explorer 的最高阶示例。它解释 autonomy 在 closing 状态下的治理关系。                                                                                          |

## Narrative Groups

### Foundation

Examples 1-3 建立 explorer 的基础语言：spawn、future、wait、scope。它们保持短小，重点是让读者理解边界内的编排关系由谁发起、等待谁、把结果收敛到哪里。Foundation 示例直接展示 shajara 运行世界内部的对象关系，宿主入口只承担示例入口职责。

### Structured Concurrency

Examples 4-6 展示流程树如何分叉、组合和竞争。Fork Join 是显式展开的基线：发起流程创建多个 spawned process，并逐个等待它们的结果。All Results 与 First Result 在同一图形语言中表达两种组合意图：前者把多个结果聚合为一个整体，后者让多份工作竞争一个结果。业务细节保持轻量，让差异集中体现在收敛关系上。

### Communication

Example 7 专门讲 channel。channel 表达流程之间的值传递和节奏控制，需要独立的通信叙事。这里的重点是通信双方如何互相影响推进节奏。

### Lifecycle

Examples 8-12 讲系统如何结束：scope-managed objects、cancellation、failure、recovery、resource。它们共同回答成功返回之外的运行树如何保持可解释。Scope-Managed Objects 先展示 scope 退出会自动收束它创建的 future 和 channel：pending future 被取消，仍打开的 channel 被撤销。返回到外层流程的 handle 是观察入口；外层流程通过其他 primitive 使用这些 handle 并捕获异常时，看到的是 owner scope 已经完成运行对象收束后的结果。后续示例把收束过程展示为结构化关系，让异常、取消和清理都回到 scope 结构中。

### Scope Boundary Objects

Example 8 引入 scope box 作为独立叙事单元。scope box 表示真实的运行所有权边界：box 内可以包含读者已经熟悉的 process 块，也可以包含该 scope 创建并拥有的运行对象，例如 future 和 channel。handle 可以从 box 内返回到外层流程，future 和 channel 的对象本体仍停留在 owner scope box 内。

Scope-Managed Objects 的演出让读者先看到对象归属，再看到 handle 可达性。child scope 创建 future 和 channel 后，box 内出现对应对象；外层流程拿到 handle 时，得到指向这些对象的观察或通信入口。child scope 收束时，box 的 closing 或 closed 状态触发内部对象自动收束：future 收敛为 canceled，channel 变为 revoked。外层流程随后触碰 handle 时，画面表达它正在观察 owner scope 已经完成的收束结果。

### Governance

Examples 13-14 放在最后。scheduler 和 reaper 需要读者已经理解 process runnable、scope closing、failure convergence。它们是 explorer 的高级章节，关注谁有权推进或裁决运行树，并在已有基础并发关系上展开治理主题。

## Naming And Copy

示例标题命名动画真正演出的关系。API 名称、代码形状和中间结构作为支撑材料出现；标题、导航名称和本地化文案共同指向同一个主题。不同 locale 的标题各自本地化，同时保留同一个概念边界。

命名的信息密度来自语义和长度的平衡。处在明确示例、业务故事或 primitive 调用上下文里的名字，应利用上下文保留区分度，减少层级关系的重复铺陈。

命名区分 shajara 术语、场景对象和视觉叙事角色。`branch`、`scope`、`future`、`channel`、`process` 用于对应的运行语义；普通并发工作、汇合位置、等待对象或通信对象按它们在演出中的关系命名。branch 指向 child scope，routine 保持在 host routine 语境中，图中运行块使用 process 语言。

业务函数名帮助读者理解谁在发起、谁在等待、谁在完成。优先选择能表达实际动作的业务词，例如订单提交、短信接收、文章发布、索引更新。`scope`、`future` 这类 shajara 概念留给运行关系本身，业务动作保持业务语义。

标题下的短说明负责把示例标题拉入 shajara 术语体系。它使用短语或片段，保持无句末标点。当标题已经提供主语时，短说明可以省略主语，直接命名核心运行关系。短说明围绕 process、future、scope、channel、cleanup 这类运行对象及其动作组织。

API 名称作为通往运行关系的入口时，适合放在 guide list 中解释代码边界。All Results 与 First Result 这类成组示例保持句式和信息密度上的对称；业务语境留给代码和 guide list。

Guide list 的长度由示例需要解释的职责数量决定。每条 guide 承担一个明确职责：动画里的 process 做了什么、哪个运行对象拥有或等待哪个对象、结果在哪里收敛。基础概念第一次出现时可以单独占一条 guide；多个职责需要分别说明时拆成多条 guide。

Guide copy 面向示例语境。它可以使用示例里的业务名和必要的 shajara 术语，用自然句式连接动作与解释。中文文案中标点自然服务阅读。

同一示例里的业务名应有足够区分度。发起者、边界内工作和 cleanup 工作在动词和对象上呈现不同职责，让读者扫过代码和图形时能快速分辨谁在等待、谁在产出、谁在清理。

## Animation Language

Explorer 的演出逻辑帮助读者区分“正在执行的 process”“被等待的运行对象”“正在流动的值”和“已经完成的结果”。下面的图形语言适用于所有示例：

- 初始帧属于 pending 状态。正式动画开始后，cursor 才进入具体 process 的运行位置；下一轮动画开始前应回到这个准备状态，让读者重新获得代码和图形的起点。
- cursor 表示 process 停留的位置。process 完成后，completed state 承接完成表达。
- 带箭头的顺序实线表示 process 块之间的推进方向。一个 process 发起 spawn、all 或 race 管理的工作时，这条线从发起块指向新创建或被组织的运行块。
- 虚线表示 process 块之间正在发生的等待关系。等待期间，虚线从被等待的一侧指向被阻塞的一侧。
- 等待完成后留下的浅色实线属于等待轨迹。它表示这段等待关系已经被结算，并与带箭头的顺序实线形成清晰区分。
- 数据流动线表示值从生产者进入通信对象、或从通信对象交付给消费者。它应与等待线使用不同视觉语义，方向跟随值的移动方向。
- 正向启动线和反向等待线分属不同演出时刻。启动表达创建方向；等待关系拥有独立的演出时刻。
- 等待关系可以拥有只服务动画叙事的演出时刻。它点亮等待线，代码片段仍保持真实控制流。
- Fork Join 等待的是 spawned process 本身的 future，spawned process 节点已经表达等待对象，虚线只承载 process 间的等待关系。
- 当一个组合 primitive 产生代表整体关系的 future 或竞争结果时，图中应给这个整体关系稳定的汇合位置。工作发起线从汇合位置展开，工作结果或竞争结果回到汇合位置，发起者再等待 future 或接收竞争结果。
- Future、channel 等运行对象的可见 label 可以来自具体示例的场景，用来表达对象身份。对象类型和场景名共同服务读者理解。
- Scope-Owned Work 等待的是 child scope 拥有的 spawned process。外层 cursor 可以停在 `branch` 行，反向等待线使用内部等待事件表达边界仍在等待 owned work。
- Scope box 表示 scope 的运行所有权边界。box 容纳该 scope 内的 process 块、future、channel 和其他 scope-owned objects；外层流程和只持有 handle 的流程留在 owner scope 之外。
- Scope-Managed Objects 使用 scope box 展示对象本体和 handle 的分离。future 和 channel 的对象本体留在创建它们的 child scope box 内；返回给外层流程的 handle 可以用细线、端点或标签表示。
- Scope box 的 lifecycle 状态驱动内部对象状态。child scope 进入 closing 或 closed 时，box 触发 pending future 的 canceled 状态和仍打开 channel 的 revoked 状态。
- Scope-Managed Objects 展示 scope 退出时自动收束它创建的 future 和 channel。child scope 创建 future 和 channel 后返回观察或通信 handle；child scope 收束事件触发 future cancellation 和 channel revocation。外层流程之后用 `wait`、`send`、`receive`、`trySend` 或 `tryReceive` 触碰这些 handle，并通过异常处理路径观察运行对象已经关闭。
- 当一个 primitive 创建或进入新的运行边界时，发起 process 的等待状态停留在发起侧，被创建 process 的运行状态从它自己的起始位置展开。跨 process 的等待线可以使用独立演出时刻，光标位置跟随实际停留的 process。
- Channel 作为独立通信对象出现。channel 的形状、容量状态和两侧数据动线共同表达通信关系；process 之间的执行顺序仍由 process 块自己的线承担。
- Channel 示例可以包含普通 send 或 receive，作为发送等待和接收等待的对照。这个对照应来自真实代码节奏，例如缓冲中已有值，并帮助读者辨认等待究竟发生在哪里。
- Channel 示例应同时让发送等待和接收等待拥有可辨识的演出位置。发送等待来自缓冲满或无接收者，接收等待来自空 channel；二者可以共享同一个 channel 图形，并使用不同等待痕迹。

## Code Excerpt Principles

Explorer 的代码片段是读者理解动画的叙事材料。动画时刻贴近真实代码动作和运行边界，代码卫生和运行语义共同支撑演出可信度。

- `try` / `finally` 承担 `return`、cleanup、异常边界或资源保护语义时，可以同时承接动画完成时刻。普通操作完成后直接进入完成状态。
- 当动画需要在 `return` 发生后标记完成时，可以使用 `try` / `finally` 让完成事件绑定到返回点。此时 `finally` 表达返回语义的收尾。
- 代码示例中的控制流优先服务读者理解。当一个操作同时承担等待和返回两个叙事动作时，可以拆成中间变量和显式返回，让两个阶段在代码回放里都清楚可见；中间步骤需要承载领域语义。
- 动画时刻、代码位置和图形状态共同表达同一个概念。命名服务动画语义，启动、等待和完成关系各自保持清晰。
- 多个示例共享同一种边界演出时，复用同一套图形语言和叙事节奏，让读者把已学过的关系迁移到新的组合场景。

## Inclusion Criteria

一个 explorer 示例值得动画化，应满足至少一个条件：

- 它展示了两个或多个运行对象之间的时间关系。
- 它展示了 scope 结构如何影响结果、取消、失败或资源释放。
- 它展示了边界内语义中难以靠静态代码解释清楚的编排关系。
- 它能为后续示例提供一个必要的概念台阶。

Explorer 示例聚焦时间关系、所有权关系、收敛关系和结构化治理。返回值形状、类型签名、普通同步控制流和宿主边界适配便利性属于 reference 或 guide 文档的解释范围。
