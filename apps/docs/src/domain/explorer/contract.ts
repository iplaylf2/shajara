import type { NonEmptyTuple, Simplify, TaggedUnion } from "type-fest";
import type { RiteCoroutine } from "@shajara/host";

export type ExplorerEventId = string;
export type ExplorerRoutineId = string;
export type ExplorerTranslationKey = string;
export type ExplorerReplayCursorMode = "blocked" | "running";

export interface ExplorerExample<
  TEvent extends ExplorerEventId,
  TResult,
  TTranslationKey extends ExplorerTranslationKey,
> {
  descriptionKey: TTranslationKey;
  guideKeys: readonly TTranslationKey[];
  id: string;
  stage: ExplorerExampleStage<TEvent, TResult>;
  titleKey: TTranslationKey;
}

export interface ExplorerExampleCodeLine<TEvent extends ExplorerEventId> {
  completion: ExplorerCodeLineCompletion<TEvent>;
  id: TEvent;
  text: string;
}

export interface ExplorerCodeLineCompletion<TEvent extends ExplorerEventId> {
  events: readonly TEvent[];
}

export interface ExplorerExampleReplay<TEvent extends ExplorerEventId, TResult> {
  replayDelayMs: number;
  runtime: ExplorerReplayRuntime<TEvent, TResult>;
}

export interface ExplorerExampleStage<TEvent extends ExplorerEventId, TResult> {
  code: readonly ExplorerExampleCodeLine<TEvent>[];
  flow: ExplorerFlowGraph<TEvent>;
  replay: ExplorerExampleReplay<TEvent, TResult>;
}

export interface ExplorerFlowGraph<TEvent extends ExplorerEventId> {
  links: readonly ExplorerFlowGraphLink<TEvent>[];
  nodes: readonly ExplorerFlowGraphNode<TEvent>[];
}

export type ExplorerFlowGraphLink<TEvent extends ExplorerEventId> = TaggedUnion<
  "kind",
  {
    data: Simplify<ExplorerFlowGraphLinkBase<TEvent>>;
    spawn: Simplify<ExplorerFlowGraphLinkBase<TEvent>>;
    wait: Simplify<
      ExplorerFlowGraphLinkBase<TEvent> & {
        readonly interruption: ExplorerWaitLinkInterruption<TEvent>;
      }
    >;
  }
>;

export interface ExplorerFlowGraphLinkBase<TEvent extends ExplorerEventId> {
  readonly activeEvents: readonly TEvent[];
  readonly displayLabel: ExplorerFlowLinkDisplayLabel;
  readonly from: string;
  readonly label: string;
  readonly to: string;
}

export type ExplorerFlowLinkDisplayLabel = TaggedUnion<
  "kind",
  {
    hidden: {};
    visible: { readonly text: string };
  }
>;

export type ExplorerWaitLinkInterruption<TEvent extends ExplorerEventId> = TaggedUnion<
  "kind",
  {
    interruptible: { readonly events: readonly TEvent[] };
    none: {};
  }
>;

export type ExplorerFlowGraphNode<TEvent extends ExplorerEventId> = TaggedUnion<
  "kind",
  {
    branch: Simplify<ExplorerRoutineFlowGraphNode<TEvent>>;
    channel: Simplify<ExplorerChannelFlowGraphNode<TEvent>>;
    join: Simplify<ExplorerRoutineFlowGraphNode<TEvent>>;
    parent: Simplify<ExplorerRoutineFlowGraphNode<TEvent>>;
  }
>;

export type ExplorerChannelFlowGraphNode<TEvent extends ExplorerEventId> =
  ExplorerFlowGraphNodeBase<TEvent> & {
    readonly channelState: ExplorerChannelFlowGraphNodeState<TEvent>;
    readonly statusRoutineIds: readonly [];
  };

export type ExplorerRoutineFlowGraphNode<TEvent extends ExplorerEventId> =
  ExplorerFlowGraphNodeBase<TEvent> & {
    readonly statusRoutineIds: readonly ExplorerRoutineId[];
  };

export interface ExplorerFlowGraphNodeBase<TEvent extends ExplorerEventId> {
  readonly activeEvents: readonly TEvent[];
  readonly completedEvents: readonly TEvent[];
  readonly id: string;
  readonly label: string;
}

export type ExplorerChannelFlowGraphNodeState<TEvent extends ExplorerEventId> = TaggedUnion<
  "kind",
  {
    metered: {
      readonly defaultLabel: string;
      readonly overloadEvents: readonly TEvent[];
      readonly states: readonly ExplorerFlowGraphNodeMeter<TEvent>[];
    };
    plain: {};
  }
>;

export type ExplorerFlowGraphNodeMeter<TEvent extends ExplorerEventId> = TaggedUnion<
  "kind",
  {
    active: Simplify<ExplorerFlowGraphNodeMeterBase<TEvent>>;
    completed: Simplify<ExplorerFlowGraphNodeMeterBase<TEvent>>;
  }
>;

export interface ExplorerFlowGraphNodeMeterBase<TEvent extends ExplorerEventId> {
  readonly events: readonly TEvent[];
  readonly label: string;
}

export interface ExplorerReplayFrame<TEvent extends ExplorerEventId> {
  active: readonly TEvent[];
  completed: readonly TEvent[];
  cursors: readonly ExplorerReplayCursor<TEvent>[];
}

export interface ExplorerReplayCursor<TEvent extends ExplorerEventId> {
  events: readonly TEvent[];
  mode: ExplorerReplayCursorMode;
  routineId: ExplorerRoutineId;
}

export interface ExplorerReplayTrace<TEvent extends ExplorerEventId> {
  actions: NonEmptyTuple<ExplorerReplayTraceAction<TEvent>>;
}

export type ExplorerReplayTraceAction<TEvent extends ExplorerEventId> = TaggedUnion<
  "kind",
  {
    "clear-cursors": { readonly routineIds: readonly ExplorerRoutineId[] };
    "complete-events": { readonly events: readonly TEvent[] };
    "set-cursors": { readonly cursors: readonly ExplorerReplayCursor<TEvent>[] };
  }
>;

export type ExplorerReplayEmit<TEvent extends ExplorerEventId> = (
  trace: ExplorerReplayTrace<TEvent>,
) => RiteCoroutine<void>;

export type ExplorerReplayRoutine<TEvent extends ExplorerEventId, TResult> = (
  emit: ExplorerReplayEmit<TEvent>,
) => RiteCoroutine<TResult>;

export interface ExplorerReplayRuntime<TEvent extends ExplorerEventId, TResult> {
  createRoutine: () => ExplorerReplayRoutine<TEvent, TResult>;
}

export interface ExplorerReplayState<TEvent extends ExplorerEventId> {
  active: readonly TEvent[];
  completed: readonly TEvent[];
  cursors: readonly ExplorerReplayCursor<TEvent>[];
}

export function createPendingExplorerReplayState<
  TEvent extends ExplorerEventId,
>(): ExplorerReplayState<TEvent> {
  return {
    active: [],
    completed: [],
    cursors: [],
  };
}
