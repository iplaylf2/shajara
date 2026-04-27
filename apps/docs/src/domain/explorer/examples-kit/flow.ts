import type { ExplorerFlowGraphLink, ExplorerFlowGraphNode } from "#/domain/explorer/contract";

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
  const link = {
    activeEvents: options.activeEvents,
    from,
    kind: "dependency",
    label,
    to,
    ...(options.interruptedEvents ? { interruptedEvents: options.interruptedEvents } : {}),
  } as const satisfies ExplorerFlowGraphLink<TEvent>;

  if (options.visibleLabel) {
    return {
      ...link,
      visibleLabel: options.visibleLabel,
    };
  }

  return link;
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
  interruptedEvents?: readonly TEvent[];
  visibleLabel?: string;
}

interface ExplorerRoutineNodeLifecycle<TEvent extends string> {
  activeEvents: readonly TEvent[];
  completedEvents: readonly TEvent[];
}
