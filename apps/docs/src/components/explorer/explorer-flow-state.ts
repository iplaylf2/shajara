import type {
  ExplorerEventId,
  ExplorerReplayCursorMode,
  ExplorerReplayState,
} from "#/domain/explorer/contract";
import type { ExplorerFlowNode, ExplorerFlowScene } from "./explorer-flow-scene";

export type FlowNodeStatusValue = ExplorerReplayCursorMode | "done" | null;
export type ChannelNodeStatusValue = "done" | "open" | "overload" | "pending";

export function isInterruptedWaitLink<TEvent extends ExplorerEventId>(
  link: ExplorerFlowScene<TEvent>["links"][number],
  state: ExplorerReplayState<TEvent>,
): boolean {
  return (
    link.variant === "wait" &&
    readLinkMode(link.activeEvents, state) === null &&
    Boolean(link.interruptedEvents && includesAny(state.completed, link.interruptedEvents))
  );
}

export function isSettledDataLink<TEvent extends ExplorerEventId>(
  link: ExplorerFlowScene<TEvent>["links"][number],
  state: ExplorerReplayState<TEvent>,
): boolean {
  return (
    link.variant === "data" &&
    readLinkMode(link.activeEvents, state) === null &&
    includesAny(state.completed, link.activeEvents)
  );
}

export function isSettledWaitLink<TEvent extends ExplorerEventId>(
  link: ExplorerFlowScene<TEvent>["links"][number],
  state: ExplorerReplayState<TEvent>,
): boolean {
  return (
    link.variant === "wait" &&
    readLinkMode(link.activeEvents, state) === null &&
    includesAny(state.completed, link.activeEvents)
  );
}

export function isSpawnLinkConsumed<TEvent extends ExplorerEventId>(
  link: ExplorerFlowScene<TEvent>["links"][number],
  scene: ExplorerFlowScene<TEvent>,
  state: ExplorerReplayState<TEvent>,
): boolean {
  if (link.variant !== "spawn" || readLinkMode(link.activeEvents, state)) {
    return false;
  }

  const targetNode = scene.nodes.find((node) => node.id === link.to);

  return Boolean(targetNode && readNodeStatus(targetNode, state));
}

export function readLinkMode<TEvent extends ExplorerEventId>(
  activeEvents: readonly TEvent[],
  state: ExplorerReplayState<TEvent>,
): ExplorerReplayCursorMode | null {
  const activeCursor = state.cursors.find((cursor) => includesAny(cursor.events, activeEvents));

  return activeCursor?.mode ?? null;
}

export function readNodeStatus<TEvent extends ExplorerEventId>(
  node: ExplorerFlowNode<TEvent>,
  state: ExplorerReplayState<TEvent>,
): FlowNodeStatusValue {
  if (includesAny(state.completed, node.completedEvents)) {
    return "done";
  }

  const activeCursor = state.cursors.find(
    (cursor) =>
      node.statusRoutineIds.includes(cursor.routineId) &&
      includesAny(cursor.events, node.activeEvents),
  );

  return activeCursor?.mode ?? null;
}

export function readChannelNodeStatus<TEvent extends ExplorerEventId>(
  node: ExplorerFlowNode<TEvent>,
  state: ExplorerReplayState<TEvent>,
): ChannelNodeStatusValue {
  if (includesAny(state.active, node.overloadEvents ?? [])) {
    return "overload";
  }

  if (includesAny(state.completed, node.completedEvents)) {
    return "done";
  }

  if (
    includesAny(state.active, node.activeEvents) ||
    includesAny(state.completed, node.activeEvents)
  ) {
    return "open";
  }

  return "pending";
}

function includesAny<TEvent extends ExplorerEventId>(
  completedEvents: readonly TEvent[],
  targetEvents: readonly TEvent[],
): boolean {
  return targetEvents.some((event) => completedEvents.includes(event));
}
