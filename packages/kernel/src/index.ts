export type { Blueprint, ImpurePlan, Plan, PurePlan } from "./contracts/plan";
export type { ProcessExit, ProcessRef } from "./contracts/process";
export type { KhoraFailure } from "./contracts/failure";
export type { ScopeTerminatedFailure } from "./failures";

export { ensureExecutor } from "./executor";
export type {
  ExecutionScopeRef,
  ExecutionScopeRootRef,
  Executor,
  LaunchFuture,
  LaunchHandle,
  LaunchResult,
  LaunchState,
} from "./executor";
export type {
  ScopeCompletedExit,
  ScopeExit,
  ScopeFailedExit,
  ScopeRef,
  ScopeSpec,
  ScopeTerminatedExit,
} from "./contracts/scope";
export type { IngressScopeRef } from "./scopes";

export {
  awaitProcess,
  awaitScope,
  bind,
  cede,
  fork,
  halt,
  lookup,
  pollProcess,
  pollScope,
  receive,
  self,
  spawn,
  terminate,
} from "./syscalls";
export type {
  AwaitProcessSyscall,
  AwaitScopeSyscall,
  BindSyscall,
  CedeSyscall,
  ForkSyscall,
  HaltSyscall,
  LookupSyscall,
  PollProcessResult,
  PollProcessSyscall,
  PollScopeResult,
  PollScopeSyscall,
  ReceiveSyscall,
  ScopeStatus,
  SelfDescriptor,
  SelfSyscall,
  SpawnDescriptor,
  SpawnRef,
  SpawnSyscall,
  TerminateSyscall,
} from "./syscalls";
export type { Syscall } from "./contracts/syscall";
