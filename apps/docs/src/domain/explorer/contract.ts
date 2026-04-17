import type { ExplorerReplayRuntimeId } from "./runtime";

export interface ExplorerExample<
  TEvent extends string = string,
  TTranslationKey extends string = string,
> {
  descriptionKey: TTranslationKey;
  guideKeys: readonly TTranslationKey[];
  id: string;
  stage: ExplorerExampleStage<TEvent>;
  titleKey: TTranslationKey;
}

export interface ExplorerExampleCodeLine<TEvent extends string = string> {
  event?: TEvent;
  text: string;
}

export interface ExplorerExampleReplay<TEvent extends string = string> {
  initialState: ExplorerReplayState<TEvent>;
  replayDelayMs: number;
  runtimeId: ExplorerReplayRuntimeId;
}

export interface ExplorerExampleStage<TEvent extends string = string> {
  code: readonly ExplorerExampleCodeLine<TEvent>[];
  replay: ExplorerExampleReplay<TEvent>;
  scene: ExplorerFlowScene<TEvent>;
}

export interface ExplorerFlowLink<TEvent extends string = string> {
  activeEvents: readonly TEvent[];
  path: string;
}

export interface ExplorerFlowNode<TEvent extends string = string> {
  activeEvents: readonly TEvent[];
  doneEvents: readonly TEvent[];
  label: string;
  left: number;
  top: number;
  variant: "branch" | "join" | "parent";
}

export interface ExplorerFlowResult {
  height: number;
  label: string;
  labelLeft: number;
  labelTop: number;
  left: number;
  radius: number;
  top: number;
  valueLeft: number;
  valueTop: number;
  width: number;
}

export interface ExplorerFlowScene<TEvent extends string = string> {
  ariaLabel: string;
  links: readonly ExplorerFlowLink<TEvent>[];
  markerId: string;
  nodes: readonly ExplorerFlowNode<TEvent>[];
  result: ExplorerFlowResult;
  scope: ExplorerFlowScope;
  ticks: readonly ExplorerFlowTick<TEvent>[];
  viewBox: string;
}

export interface ExplorerFlowScope {
  height: number;
  label: string;
  labelLeft: number;
  labelTop: number;
  left: number;
  radius: number;
  top: number;
  width: number;
}

export interface ExplorerFlowTick<TEvent extends string = string> {
  label: string;
  left: number;
  top: number;
  visibleEvents: readonly TEvent[];
}

export interface ExplorerReplayRunner<TEvent extends string = string, TResult = unknown> {
  cancel: () => Promise<void>;
  run: (mark: (event: TEvent) => void) => Promise<TResult>;
}

export interface ExplorerReplayRuntime<TEvent extends string = string, TResult = unknown> {
  createRunner: () => ExplorerReplayRunner<TEvent, TResult>;
  formatResult: (result: TResult) => string;
}

export interface ExplorerReplayState<TEvent extends string = string> {
  active: TEvent;
  completed: readonly TEvent[];
  result: string;
}
