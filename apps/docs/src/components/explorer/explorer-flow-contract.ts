import type {
  ExplorerChannelFlowGraphNodeState,
  ExplorerEventId,
  ExplorerFlowGraphLink,
  ExplorerWaitLinkInterruption,
} from "#/domain/explorer/contract";

export interface ExplorerFlowLink<TEvent extends ExplorerEventId> {
  activeEvents: readonly TEvent[];
  displayLabel: ExplorerFlowGraphLink<TEvent>["displayLabel"];
  from: string;
  interruption: ExplorerWaitLinkInterruption<TEvent> | { readonly kind: "none" };
  label: string;
  labelX: number;
  labelY: number;
  path: string;
  to: string;
  variant: ExplorerFlowGraphLink<TEvent>["kind"];
}

export type ExplorerFlowNode<TEvent extends ExplorerEventId> =
  | ExplorerChannelFlowNode<TEvent>
  | ExplorerRoutineFlowNode<TEvent>;

export interface ExplorerChannelFlowNode<
  TEvent extends ExplorerEventId,
> extends ExplorerFlowNodeBase<TEvent> {
  channelState: ExplorerChannelFlowGraphNodeState<TEvent>;
  statusRoutineIds: readonly [];
  variant: "channel";
}

export interface ExplorerRoutineFlowNode<
  TEvent extends ExplorerEventId,
> extends ExplorerFlowNodeBase<TEvent> {
  statusRoutineIds: readonly string[];
  variant: "branch" | "join" | "parent";
}

export interface ExplorerFlowNodeBase<TEvent extends ExplorerEventId> {
  activeEvents: readonly TEvent[];
  completedEvents: readonly TEvent[];
  centerY: number;
  height: number;
  id: string;
  label: string;
  left: number;
  top: number;
  width: number;
}

export interface ExplorerFlowScene<TEvent extends ExplorerEventId> {
  ariaLabel: string;
  links: readonly ExplorerFlowLink<TEvent>[];
  markerId: string;
  nodes: readonly ExplorerFlowNode<TEvent>[];
  viewBox: string;
}
