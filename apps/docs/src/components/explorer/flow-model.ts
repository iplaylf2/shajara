import type {
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
  | RoutineFlowNode<TEvent>;

export interface ChannelFlowNode<TEvent extends ExplorerEventId> extends FlowNodeBase<TEvent> {
  channelState: ExplorerChannelState<TEvent>;
  statusRoutineIds: readonly [];
  variant: "channel";
}

export interface RoutineFlowNode<TEvent extends ExplorerEventId> extends FlowNodeBase<TEvent> {
  statusRoutineIds: readonly string[];
  variant: "branch" | "join" | "parent";
}

export interface FlowNodeBase<TEvent extends ExplorerEventId> {
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

export interface FlowScene<TEvent extends ExplorerEventId> {
  ariaLabel: string;
  links: readonly FlowLink<TEvent>[];
  markerId: string;
  nodes: readonly FlowNode<TEvent>[];
  viewBox: string;
}
