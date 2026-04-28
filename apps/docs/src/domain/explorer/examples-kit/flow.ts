import type {
  ExplorerChannelFlowGraphNodeState,
  ExplorerFlowGraphLink,
  ExplorerFlowGraphNode,
  ExplorerFlowGraphNodeMeter,
} from "#/domain/explorer/contract";

export function spawnLink<TEvent extends string>(
  from: string,
  to: string,
  label: string,
  activeEvents: readonly TEvent[],
): ExplorerFlowGraphLink<TEvent> {
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
  options: ExplorerFlowLinkActivity<TEvent>,
): ExplorerFlowGraphLink<TEvent> {
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
): ExplorerFlowGraphLink<TEvent> {
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
  lifecycle: ExplorerRoutineNodeLifecycle<TEvent>,
  state: ExplorerChannelNodeState<TEvent>,
): ExplorerFlowGraphNode<TEvent> {
  return {
    activeEvents: lifecycle.activeEvents,
    channelState: state,
    completedEvents: lifecycle.completedEvents,
    id,
    kind: "channel",
    label,
    statusRoutineIds: [],
  };
}

export function parentRoutineNode<TEvent extends string>(
  id: string,
  label: string,
  lifecycle: ExplorerRoutineNodeLifecycle<TEvent>,
): ExplorerFlowGraphNode<TEvent> {
  return routineNode("parent", id, label, lifecycle);
}

export function branchRoutineNode<TEvent extends string>(
  id: string,
  label: string,
  lifecycle: ExplorerRoutineNodeLifecycle<TEvent>,
): ExplorerFlowGraphNode<TEvent> {
  return routineNode("branch", id, label, lifecycle);
}

function routineNode<TEvent extends string>(
  kind: "branch" | "join" | "parent",
  id: string,
  label: string,
  lifecycle: ExplorerRoutineNodeLifecycle<TEvent>,
): ExplorerFlowGraphNode<TEvent> {
  return {
    activeEvents: lifecycle.activeEvents,
    completedEvents: lifecycle.completedEvents,
    id,
    kind,
    label,
    statusRoutineIds: [id],
  };
}

interface ExplorerFlowLinkActivity<TEvent extends string> {
  activeEvents: readonly TEvent[];
  displayLabel: ExplorerFlowGraphLink<TEvent>["displayLabel"];
  interruption: Extract<ExplorerFlowGraphLink<TEvent>, { kind: "wait" }>["interruption"];
}

interface ExplorerRoutineNodeLifecycle<TEvent extends string> {
  activeEvents: readonly TEvent[];
  completedEvents: readonly TEvent[];
}

type ExplorerChannelNodeState<TEvent extends string> = ExplorerChannelFlowGraphNodeState<TEvent>;

export function waitActivity<TEvent extends string>(
  activeEvents: readonly TEvent[],
): ExplorerFlowLinkActivity<TEvent> {
  return {
    activeEvents,
    displayLabel: { kind: "hidden" },
    interruption: { kind: "none" },
  };
}

export function interruptedWaitActivity<TEvent extends string>(
  activeEvents: readonly TEvent[],
  interruptedEvents: readonly TEvent[],
): ExplorerFlowLinkActivity<TEvent> {
  return {
    activeEvents,
    displayLabel: { kind: "hidden" },
    interruption: { events: interruptedEvents, kind: "interruptible" },
  };
}

export function labeledWaitActivity<TEvent extends string>(
  activeEvents: readonly TEvent[],
  visibleLabel: string,
): ExplorerFlowLinkActivity<TEvent> {
  return {
    activeEvents,
    displayLabel: { kind: "visible", text: visibleLabel },
    interruption: { kind: "none" },
  };
}

export function meteredChannelState<TEvent extends string>(
  defaultLabel: string,
  states: readonly ExplorerFlowGraphNodeMeter<TEvent>[],
  overloadEvents: readonly TEvent[],
): ExplorerChannelNodeState<TEvent> {
  return {
    defaultLabel,
    kind: "metered",
    overloadEvents,
    states,
  };
}

export function activeMeter<TEvent extends string>(
  label: string,
  events: readonly TEvent[],
): ExplorerFlowGraphNodeMeter<TEvent> {
  return { events, kind: "active", label };
}

export function completedMeter<TEvent extends string>(
  label: string,
  events: readonly TEvent[],
): ExplorerFlowGraphNodeMeter<TEvent> {
  return { events, kind: "completed", label };
}
