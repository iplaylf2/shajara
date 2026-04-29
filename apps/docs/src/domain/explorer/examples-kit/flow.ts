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
    statusRoutineIds: [],
  };
}

export function futureNode<TEvent extends string>(
  id: string,
  label: string,
  lifecycle: RoutineNodeLifecycle<TEvent>,
): ExplorerFlowNode<TEvent> {
  return {
    activeEvents: lifecycle.activeEvents,
    completedEvents: lifecycle.completedEvents,
    id,
    kind: "future",
    label,
    statusRoutineIds: [],
  };
}

export function parentRoutineNode<TEvent extends string>(
  id: string,
  label: string,
  lifecycle: RoutineNodeLifecycle<TEvent>,
): ExplorerFlowNode<TEvent> {
  return routineNode("parent", id, label, lifecycle);
}

export function branchRoutineNode<TEvent extends string>(
  id: string,
  label: string,
  lifecycle: RoutineNodeLifecycle<TEvent>,
): ExplorerFlowNode<TEvent> {
  return routineNode("branch", id, label, lifecycle);
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
    completedEvents: lifecycle.completedEvents,
    id,
    kind: "scope",
    label,
    ownedNodeIds,
    statusRoutineIds: [],
  };
}

function routineNode<TEvent extends string>(
  kind: "branch" | "join" | "parent",
  id: string,
  label: string,
  lifecycle: RoutineNodeLifecycle<TEvent>,
): ExplorerFlowNode<TEvent> {
  return {
    activeEvents: lifecycle.activeEvents,
    completedEvents: lifecycle.completedEvents,
    id,
    kind,
    label,
    statusRoutineIds: [id],
  };
}

interface WaitLinkOptions<TEvent extends string> {
  activeEvents: readonly TEvent[];
  displayLabel: ExplorerFlowLink<TEvent>["displayLabel"];
  interruption: ExplorerWaitInterruption<TEvent>;
}

interface RoutineNodeLifecycle<TEvent extends string> {
  activeEvents: readonly TEvent[];
  completedEvents: readonly TEvent[];
}

interface ChannelNodeLifecycle<TEvent extends string> extends RoutineNodeLifecycle<TEvent> {
  direction?: ExplorerChannelDirection;
}

interface ScopeNodeLifecycle<TEvent extends string> extends RoutineNodeLifecycle<TEvent> {
  closedEvents: readonly TEvent[];
}
