import type { NonEmptyTuple, TaggedUnion } from "type-fest";
import type { RiteCoroutine } from "@shajara/host";

export type ExplorerEventId = string;
export type ExplorerCursorTargetId = string;
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

export type ExplorerExampleCodeEntry<TEvent extends ExplorerEventId> =
  | ExplorerExampleCodeLine<TEvent>
  | ExplorerExampleCodeSpacer;

export interface ExplorerExampleCodeLine<TEvent extends ExplorerEventId> {
  completion: ExplorerCodeCompletion<TEvent>;
  id: TEvent;
  text: string;
}

export interface ExplorerExampleCodeSpacer {
  kind: "spacer";
  text: "";
}

export interface ExplorerCodeCompletion<TEvent extends ExplorerEventId> {
  events: readonly TEvent[];
}

export interface ExplorerExampleReplay<TEvent extends ExplorerEventId, TResult> {
  replayDelayMs: number;
  runtime: ExplorerReplayRuntime<TEvent, TResult>;
}

export interface ExplorerExampleStage<TEvent extends ExplorerEventId, TResult> {
  code: readonly ExplorerExampleCodeEntry<TEvent>[];
  flow: ExplorerFlow<TEvent>;
  replay: ExplorerExampleReplay<TEvent, TResult>;
}

export interface ExplorerFlow<TEvent extends ExplorerEventId> {
  links: readonly ExplorerFlowLink<TEvent>[];
  nodes: readonly ExplorerFlowNode<TEvent>[];
}

export type ExplorerFlowLink<TEvent extends ExplorerEventId> = TaggedUnion<
  "kind",
  {
    data: {
      readonly activeEvents: readonly TEvent[];
      readonly displayLabel: ExplorerFlowLinkLabel;
      readonly from: string;
      readonly label: string;
      readonly to: string;
    };
    spawn: {
      readonly activeEvents: readonly TEvent[];
      readonly displayLabel: ExplorerFlowLinkLabel;
      readonly from: string;
      readonly label: string;
      readonly to: string;
    };
    wait: {
      readonly activeEvents: readonly TEvent[];
      readonly displayLabel: ExplorerFlowLinkLabel;
      readonly from: string;
      readonly interruption: ExplorerWaitInterruption<TEvent>;
      readonly label: string;
      readonly to: string;
    };
  }
>;

export type ExplorerFlowLinkLabel = TaggedUnion<
  "kind",
  {
    hidden: {};
    visible: { readonly text: string };
  }
>;

export type ExplorerWaitInterruption<TEvent extends ExplorerEventId> = TaggedUnion<
  "kind",
  {
    interruptible: { readonly events: readonly TEvent[] };
    none: {};
  }
>;

export type ExplorerFlowNode<TEvent extends ExplorerEventId> = TaggedUnion<
  "kind",
  {
    caller: {
      readonly activeEvents: readonly TEvent[];
      readonly completedEvents: readonly TEvent[];
      readonly id: string;
      readonly label: string;
      readonly statusTargetIds: readonly ExplorerCursorTargetId[];
    };
    channel: {
      readonly activeEvents: readonly TEvent[];
      readonly channelState: ExplorerChannelState<TEvent>;
      readonly completedEvents: readonly TEvent[];
      readonly direction: ExplorerChannelDirection;
      readonly id: string;
      readonly label: string;
      readonly statusTargetIds: readonly [];
    };
    coordinator: {
      readonly activeEvents: readonly TEvent[];
      readonly completedEvents: readonly TEvent[];
      readonly id: string;
      readonly label: string;
      readonly statusTargetIds: readonly ExplorerCursorTargetId[];
    };
    future: {
      readonly activeEvents: readonly TEvent[];
      readonly completedEvents: readonly TEvent[];
      readonly id: string;
      readonly label: string;
      readonly statusTargetIds: readonly [];
    };
    worker: {
      readonly activeEvents: readonly TEvent[];
      readonly completedEvents: readonly TEvent[];
      readonly id: string;
      readonly label: string;
      readonly statusTargetIds: readonly ExplorerCursorTargetId[];
    };
    scope: {
      readonly activeEvents: readonly TEvent[];
      readonly closedEvents: readonly TEvent[];
      readonly completedEvents: readonly TEvent[];
      readonly id: string;
      readonly label: string;
      readonly ownedNodeIds: readonly string[];
      readonly statusTargetIds: readonly [];
    };
  }
>;

export type ExplorerChannelDirection = "left" | "right";

export type ExplorerChannelState<TEvent extends ExplorerEventId> = TaggedUnion<
  "kind",
  {
    metered: {
      readonly defaultLabel: string;
      readonly overloadEvents: readonly TEvent[];
      readonly states: readonly ExplorerChannelMeter<TEvent>[];
    };
    plain: {};
  }
>;

export type ExplorerChannelMeter<TEvent extends ExplorerEventId> = TaggedUnion<
  "kind",
  {
    active: {
      readonly events: readonly TEvent[];
      readonly label: string;
    };
    completed: {
      readonly events: readonly TEvent[];
      readonly label: string;
    };
  }
>;

export interface ExplorerReplayFrame<TEvent extends ExplorerEventId> {
  active: readonly TEvent[];
  completed: readonly TEvent[];
  cursors: readonly ExplorerReplayCursor<TEvent>[];
}

export interface ExplorerReplayCursor<TEvent extends ExplorerEventId> {
  events: readonly TEvent[];
  mode: ExplorerReplayCursorMode;
  targetId: ExplorerCursorTargetId;
}

export interface ExplorerReplayTrace<TEvent extends ExplorerEventId> {
  actions: NonEmptyTuple<ExplorerReplayAction<TEvent>>;
}

export type ExplorerReplayAction<TEvent extends ExplorerEventId> = TaggedUnion<
  "kind",
  {
    "clear-cursors": { readonly targetIds: readonly ExplorerCursorTargetId[] };
    "complete-events": { readonly events: readonly TEvent[] };
    "set-cursors": { readonly cursors: readonly ExplorerReplayCursor<TEvent>[] };
  }
>;

export type ExplorerReplayEmit<TEvent extends ExplorerEventId> = (
  trace: ExplorerReplayTrace<TEvent>,
) => void;

export type ExplorerReplayProgram<TEvent extends ExplorerEventId, TResult> = (
  emit: ExplorerReplayEmit<TEvent>,
) => RiteCoroutine<TResult>;

export interface ExplorerReplayRuntime<TEvent extends ExplorerEventId, TResult> {
  createProgram: () => ExplorerReplayProgram<TEvent, TResult>;
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

export function isExplorerExampleCodeLine<TEvent extends ExplorerEventId>(
  entry: ExplorerExampleCodeEntry<TEvent>,
): entry is ExplorerExampleCodeLine<TEvent> {
  return "id" in entry;
}
