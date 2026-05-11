import type {
  ExplorerChannelDirection,
  ExplorerChannelState,
  ExplorerEventId,
  ExplorerWaitInterruption,
  ExplorerFlowLink as FlowLinkSpec,
} from "#/domain/explorer/contract";

export interface FlowLink<TEvent extends ExplorerEventId> {
  activeEvents: readonly TEvent[];
  displayLabel: FlowLinkSpec<TEvent>["displayLabel"];
  from: string;
  interruption: ExplorerWaitInterruption<TEvent> | { readonly kind: "none" };
  label: string;
  labelX: number;
  labelY: number;
  path: string;
  to: string;
  variant: FlowLinkSpec<TEvent>["kind"];
}

export type FlowNode<TEvent extends ExplorerEventId> =
  | ChannelFlowNode<TEvent>
  | FutureFlowNode<TEvent>
  | ProcessFlowNode<TEvent>;

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

export interface ProcessFlowNode<TEvent extends ExplorerEventId> extends FlowNodeBase<TEvent> {
  statusTargetIds: readonly string[];
  variant: "caller" | "coordinator" | "worker";
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
