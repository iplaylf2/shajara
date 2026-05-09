import type {
  ExplorerChannelDirection,
  ExplorerChannelState,
  ExplorerFlowLink,
  ExplorerFlowNode,
  ExplorerWaitInterruption,
} from "#/domain/explorer/contract";

export function spawnLink<TEvent extends string>(
  from: string,
  to: string,
  label: string,
  activeEvents: readonly TEvent[],
): ExplorerFlowLink<TEvent> {
  return {
    activeEvents,
    displayLabel: { kind: "hidden" },
    from,
    kind: "spawn",
    label,
    to,
  };
}

export function waitLink<TEvent extends string>(
  from: string,
  to: string,
  label: string,
  options: WaitLinkOptions<TEvent>,
): ExplorerFlowLink<TEvent> {
  return {
    activeEvents: options.activeEvents,
    displayLabel: options.displayLabel,
    from,
    interruption: options.interruption,
    kind: "wait",
    label,
    to,
  };
}

export function dataLink<TEvent extends string>(
  from: string,
  to: string,
  label: string,
  activeEvents: readonly TEvent[],
): ExplorerFlowLink<TEvent> {
  return {
    activeEvents,
    displayLabel: { kind: "hidden" },
    from,
    kind: "data",
    label,
    to,
  };
}

export function channelNode<TEvent extends string>(
  id: string,
  label: string,
  lifecycle: ChannelNodeLifecycle<TEvent>,
  state: ExplorerChannelState<TEvent>,
): ExplorerFlowNode<TEvent> {
  return {
    activeEvents: lifecycle.activeEvents,
    channelState: state,
    completedEvents: lifecycle.completedEvents,
    direction: lifecycle.direction ?? "right",
    id,
    kind: "channel",
    label,
    statusTargetIds: [],
  };
}

export function futureNode<TEvent extends string>(
  id: string,
  label: string,
  lifecycle: FlowNodeLifecycle<TEvent>,
): ExplorerFlowNode<TEvent> {
  return {
    activeEvents: lifecycle.activeEvents,
    completedEvents: lifecycle.completedEvents,
    id,
    kind: "future",
    label,
    statusTargetIds: [],
  };
}

export function callerNode<TEvent extends string>(
  id: string,
  label: string,
  lifecycle: FlowNodeLifecycle<TEvent>,
): ExplorerFlowNode<TEvent> {
  return processNode("caller", id, label, lifecycle);
}

export function workerNode<TEvent extends string>(
  id: string,
  label: string,
  lifecycle: FlowNodeLifecycle<TEvent>,
): ExplorerFlowNode<TEvent> {
  return processNode("worker", id, label, lifecycle);
}

export function coordinatorNode<TEvent extends string>(
  id: string,
  label: string,
  lifecycle: FlowNodeLifecycle<TEvent>,
  statusTargetIds: readonly string[] = [id],
): ExplorerFlowNode<TEvent> {
  return {
    activeEvents: lifecycle.activeEvents,
    completedEvents: lifecycle.completedEvents,
    id,
    kind: "coordinator",
    label,
    statusTargetIds,
  };
}

export function scopeNode<TEvent extends string>(
  id: string,
  label: string,
  ownedNodeIds: readonly string[],
  lifecycle: ScopeNodeLifecycle<TEvent>,
): ExplorerFlowNode<TEvent> {
  return {
    activeEvents: lifecycle.activeEvents,
    closedEvents: lifecycle.closedEvents,
    closingEvents: lifecycle.closingEvents ?? [],
    completedEvents: lifecycle.completedEvents,
    id,
    kind: "scope",
    label,
    ownedNodeIds,
    statusTargetIds: [],
  };
}

function processNode<TEvent extends string>(
  kind: "caller" | "worker",
  id: string,
  label: string,
  lifecycle: FlowNodeLifecycle<TEvent>,
): ExplorerFlowNode<TEvent> {
  return {
    activeEvents: lifecycle.activeEvents,
    completedEvents: lifecycle.completedEvents,
    id,
    kind,
    label,
    statusTargetIds: [id],
  };
}

interface WaitLinkOptions<TEvent extends string> {
  activeEvents: readonly TEvent[];
  displayLabel: ExplorerFlowLink<TEvent>["displayLabel"];
  interruption: ExplorerWaitInterruption<TEvent>;
}

interface FlowNodeLifecycle<TEvent extends string> {
  activeEvents: readonly TEvent[];
  completedEvents: readonly TEvent[];
}

interface ChannelNodeLifecycle<TEvent extends string> extends FlowNodeLifecycle<TEvent> {
  direction?: ExplorerChannelDirection;
}

interface ScopeNodeLifecycle<TEvent extends string> extends FlowNodeLifecycle<TEvent> {
  closedEvents: readonly TEvent[];
  closingEvents?: readonly TEvent[];
}
