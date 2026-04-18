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
  event?: TEvent;
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
  resultLabel: string;
  scopeLabel: string;
  ticks: readonly ExplorerFlowGraphTick<TEvent>[];
}

export interface ExplorerFlowGraphLink<TEvent extends string = string> {
  activeEvents: readonly TEvent[];
  from: string;
  to: string;
}

export interface ExplorerFlowGraphNode<TEvent extends string = string> {
  activeEvents: readonly TEvent[];
  doneEvents: readonly TEvent[];
  id: string;
  kind: "branch" | "join" | "parent";
  label: string;
}

export interface ExplorerFlowGraphTick<TEvent extends string = string> {
  label: string;
  nodeId: string;
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
