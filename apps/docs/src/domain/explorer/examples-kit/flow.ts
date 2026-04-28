import type {
  ExplorerChannelFlowGraphNodeState,
  ExplorerFlowGraphLink,
  ExplorerFlowGraphNode,
  ExplorerWaitLinkInterruption,
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
  options: ExplorerWaitLinkOptions<TEvent>,
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
  state: ExplorerChannelFlowGraphNodeState<TEvent>,
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

interface ExplorerWaitLinkOptions<TEvent extends string> {
  activeEvents: readonly TEvent[];
  displayLabel: ExplorerFlowGraphLink<TEvent>["displayLabel"];
  interruption: ExplorerWaitLinkInterruption<TEvent>;
}

interface ExplorerRoutineNodeLifecycle<TEvent extends string> {
  activeEvents: readonly TEvent[];
  completedEvents: readonly TEvent[];
}
