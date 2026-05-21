import type {
  ExplorerChannelDirection,
  ExplorerChannelState,
  ExplorerEventId,
  ExplorerFlowLink,
  ExplorerFlowNode,
  ExplorerWaitInterruption,
} from "#/domain/explorer/contract";

export interface FlowLink<TEvent extends ExplorerEventId> {
  activeEvents: readonly TEvent[];
  displayLabel: ExplorerFlowLink<TEvent>["displayLabel"];
  from: string;
  interruption: ExplorerWaitInterruption<TEvent> | { readonly kind: "none" };
  label: string;
  labelX: number;
  labelY: number;
  path: string;
  to: string;
  variant: ExplorerFlowLink<TEvent>["kind"];
}

export type FlowNode<TEvent extends ExplorerEventId> =
  | ChannelFlowNode<TEvent>
  | CoroutineFlowNode<TEvent>
  | FutureFlowNode<TEvent>;

export interface ChannelFlowNode<TEvent extends ExplorerEventId> extends FlowNodeBase<TEvent> {
  channelDirection: ExplorerChannelDirection;
  channelState: ExplorerChannelState<TEvent>;
  statusTargetIds: readonly [];
  variant: "channel";
}

export interface FutureFlowNode<TEvent extends ExplorerEventId> extends FlowNodeBase<TEvent> {
  statusTargetIds: readonly [];
  variant: "future";
}

export interface CoroutineFlowNode<TEvent extends ExplorerEventId> extends FlowNodeBase<TEvent> {
  statusTargetIds: ExplorerCoroutineFlowNode<TEvent>["statusTargetIds"];
  variant: ExplorerCoroutineFlowNode<TEvent>["kind"];
}

export interface ScopeFlowGroup<TEvent extends ExplorerEventId> extends FlowNodeBase<TEvent> {
  closedEvents: readonly TEvent[];
  closingEvents: readonly TEvent[];
  ownedNodeIds: readonly string[];
  statusTargetIds: readonly [];
  variant: "scope";
}

export interface FlowNodeBase<TEvent extends ExplorerEventId> {
  activeEvents: readonly TEvent[];
  completedEvents: readonly TEvent[];
  centerY: number;
  height: number;
  id: string;
  label: string;
  left: number;
  objectEnterFrom?: "left" | "top";
  top: number;
  width: number;
}

export interface FlowScene<TEvent extends ExplorerEventId> {
  ariaLabel: string;
  groups: readonly ScopeFlowGroup<TEvent>[];
  links: readonly FlowLink<TEvent>[];
  markerId: string;
  nodes: readonly FlowNode<TEvent>[];
  viewBox: string;
}

type ExplorerCoroutineFlowNode<TEvent extends ExplorerEventId> = Extract<
  ExplorerFlowNode<TEvent>,
  { kind: "caller" | "coordinator" | "worker" }
>;
