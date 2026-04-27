import type {
  ExplorerExampleCodeLine,
  ExplorerFlowGraphLink,
  ExplorerFlowGraphNode,
  ExplorerReplayCursor,
} from "#/domain/explorer/contract";

export function codeLine<TEvent extends string>(
  id: TEvent,
  text: string,
  completedEvents?: readonly TEvent[],
): ExplorerExampleCodeLine<TEvent> {
  if (!completedEvents) {
    return { id, text };
  }

  return { completedEvents, id, text };
}

export function cursorAt<TEvent extends string>(
  routineId: string,
  event: TEvent | readonly TEvent[],
  mode: ExplorerReplayCursor<TEvent>["mode"],
): ExplorerReplayCursor<TEvent> {
  return {
    events: typeof event === "string" ? [event] : event,
    mode,
    routineId,
  };
}

export function spawnLink<TEvent extends string>(
  from: string,
  to: string,
  label: string,
  activeEvents: readonly TEvent[],
): ExplorerFlowGraphLink<TEvent> {
  return {
    activeEvents,
    from,
    kind: "spawn",
    label,
    to,
  };
}

export function dependencyLink<TEvent extends string>(
  from: string,
  to: string,
  label: string,
  options: ExplorerFlowLinkActivity<TEvent>,
): ExplorerFlowGraphLink<TEvent> {
  if (options.visibleLabel) {
    return {
      activeEvents: options.activeEvents,
      from,
      kind: "dependency",
      label,
      to,
      visibleLabel: options.visibleLabel,
    };
  }

  return {
    activeEvents: options.activeEvents,
    from,
    kind: "dependency",
    label,
    to,
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
  kind: ExplorerFlowGraphNode<TEvent>["kind"],
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
  visibleLabel?: string;
}

interface ExplorerRoutineNodeLifecycle<TEvent extends string> {
  activeEvents: readonly TEvent[];
  completedEvents: readonly TEvent[];
}
