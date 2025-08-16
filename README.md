# **khora: A Blueprint for a Structured Concurrency Runtime**

**核心哲学**: khora 是一个用于构建并发系统的运行时。其设计基于一套微型的、形式化的元指令集（Core Calculus）。该模型不仅强制实现了结构化并发——确保所有计算的生命周期都得到严格管理——而且为实现代数效应（Algebraic Effects）等高级控制流（如故障恢复与上下文传播）提供了语义基础。

## **I. 核心演算：元指令集 (The Core Calculus)**

这是 khora 抽象机器的原子操作。它们构成了所有上层行为的语义基础，并定义了运行时的执行模型。此部分对引擎实现者至关重要，用户不应直接与之交互。

1.  **`EnterScope(options)`**
    *   语义: 创建并进入一个新的、嵌套的生命周期作用域。

2.  **`ExitScope`**
    *   语义: 声明当前作用域逻辑完成，并启动其终止程序。

3.  **`Spawn(operation, scopeId)`**
    *   语义: 在指定作用域内实例化一个 `Operation` 为一个可运行的 `Task`。

4.  **`Suspend(reason)`**
    *   语义: 将当前 `Task` 从可运行队列中移除，等待被唤醒。

5.  **`Send(taskId, message)`**
    *   语义: 向指定 `Task` 的邮箱异步发送一条消息。

6.  **`Link(taskId)`**
    *   语义: 建立生命周期链接，将目标 `Task` 的终止事件转化为一条可观察的系统消息。

7.  **`WatchExternal(handle)`**
    *   语义: 请求引擎监视一个外部异步句柄，并在其完成时发送一条系统消息。

8.  **`RegisterInterceptor(handler)`**
    *   语义: 为当前作用域注册一个故障拦截器，用于实现可编程的恢复策略。

---

## **II. 标准库：用户原语 (The Standard Library)**

这些是提供给用户的、构建在核心演算之上的高级抽象。

### **并发原语 (Concurrency Primitives)**

*   **`all<T>(operations: Operation<T>[]): Operation<T[]>`**
    并行执行操作。当所有操作成功时，返回结果数组；任一操作失败则整体失败。

*   **`race<T>(operations: Operation<T>[]): Operation<T>`**
    并行执行操作。返回第一个完成（成功或失败）的操作的结果，并终止其余操作。

*   **`spawn(operation: Operation<any>): Operation<void>`**
    在当前作用域启动一个后台任务，不阻塞主流程。

### **控制流原语 (Control Flow Primitives)**

*   **`scoped<T>(operation: Operation<T>): Operation<T>`**
    在一个专用的、显式的子作用域内执行一个 `Operation`，创建一个故障隔离边界。

*   **`intercept<T>(handler: (error: Error) => Operation<T>): Operation<T>`**
    为当前作用域注册一个故障拦截器。它允许捕获作用域内任何任务的失败，并执行自定义的恢复或错误传播逻辑。

### **资源与上下文 (Resource & Context Primitives)**

*   **`resource<T>(setup: Operation<T>): Operation<T>`**
    安全地管理需要显式清理的资源，确保其生命周期与作用域绑定。

*   **`provide<T>(context: Context<T>, value: T): Operation<void>`**
    为当前作用域及其所有子作用域设置一个上下文值。

*   **`useContext<T>(context: Context<T>): Operation<T>`**
    从当前作用域层级中读取一个上下文值，沿作用域树向上查找。

### **同步与通信 (Synchronization & Communication Primitives)**

*   **`createLock(): Operation<Lock>`**
    创建一个互斥锁。

*   **`createSignal(): Operation<Signal>`**
    创建一个条件变量。

*   **`createChannel<T>(): Operation<Channel<T>>`**
    创建一个异步消息通道。

---

## **III. 边界接口：与宿主环境集成 (The Boundary Interface)**

这些函数是 khora 运行时与外部 JavaScript 环境交互的桥梁。

*   **`run<T>(operation: Operation<T>): Promise<T>`**
    执行一个根 `Operation` 的入口点，返回一个 `Promise` 作为其最终结果。

*   **`call<T>(promiseFn: () => Promise<T>): Operation<T>`**
    将一个返回 `Promise` 的函数调用安全地包装成一个惰性的、可被 khora 管理和取消的 `Operation`。

*   **`sleep(ms: number): Operation<void>`**
    一个可安全取消的延时操作。