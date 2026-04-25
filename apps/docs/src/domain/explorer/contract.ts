import type { RiteCoroutine } from "@shajara/host";

export interface ExplorerExample<
  TEvent extends string = string,
  TTranslationKey extends string = string,
  TResult = unknown,
> {
  descriptionKey: TTranslationKey;
  guideKeys: readonly TTranslationKey[];
  id: string;
  stage: ExplorerExampleStage<TEvent, TResult>;
  titleKey: TTranslationKey;
}

export interface ExplorerExampleCodeLine<TEvent extends string = string> {
  id: TEvent;
  completedEvents?: readonly TEvent[];
  text: string;
}

export interface ExplorerExampleReplay<TEvent extends string = string, TResult = unknown> {
  initialState: ExplorerReplayState<TEvent>;
  replayDelayMs: number;
  runtime: ExplorerReplayRuntime<TEvent, TResult>;
}

export interface ExplorerExampleStage<TEvent extends string = string, TResult = unknown> {
  code: readonly ExplorerExampleCodeLine<TEvent>[];
  flow: ExplorerFlowGraph<TEvent>;
  replay: ExplorerExampleReplay<TEvent, TResult>;
}

export interface ExplorerFlowGraph<TEvent extends string = string> {
  links: readonly ExplorerFlowGraphLink<TEvent>[];
  nodes: readonly ExplorerFlowGraphNode<TEvent>[];
  ticks: readonly ExplorerFlowGraphTick<TEvent>[];
}

export interface ExplorerFlowGraphLink<TEvent extends string = string> {
  activeEvents: readonly TEvent[];
  from: string;
  to: string;
}

export interface ExplorerFlowGraphNode<TEvent extends string = string> {
  activeEvents: readonly TEvent[];
  completedEvents: readonly TEvent[];
  id: string;
  kind: "branch" | "join" | "parent";
  label: string;
}

export interface ExplorerFlowGraphTick<TEvent extends string = string> {
  label: string;
  nodeId: string;
  visibleEvents: readonly TEvent[];
}

export interface ExplorerReplayFrame<TEvent extends string = string> {
  active: readonly TEvent[];
  completed: readonly TEvent[];
  cursors: readonly ExplorerReplayCursor<TEvent>[];
}

export interface ExplorerReplayCursor<TEvent extends string = string> {
  events: readonly TEvent[];
  mode: "blocked" | "running";
  routineId: string;
}

export interface ExplorerReplayTrace<TEvent extends string = string> {
  clearCursor?: string;
  completed?: TEvent;
  cursor?: ExplorerReplayCursor<TEvent>;
}

export type ExplorerReplayEmit<TEvent extends string = string> = (
  trace: ExplorerReplayTrace<TEvent>,
) => RiteCoroutine<void>;

export type ExplorerReplayRoutine<TEvent extends string = string, TResult = unknown> = (
  emit: ExplorerReplayEmit<TEvent>,
) => RiteCoroutine<TResult>;

export interface ExplorerReplayRuntime<TEvent extends string = string, TResult = unknown> {
  createRoutine: () => ExplorerReplayRoutine<TEvent, TResult>;
}

export interface ExplorerReplayState<TEvent extends string = string> {
  active: readonly TEvent[];
  completed: readonly TEvent[];
  cursors: readonly ExplorerReplayCursor<TEvent>[];
}
