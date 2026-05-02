import type {
  ExplorerEventId,
  ExplorerReplayCursorMode,
  ExplorerReplayState,
} from "#/domain/explorer/contract";
import type { FlowNode, FlowScene } from "./flow-model";

export type FlowNodeStatusValue = ExplorerReplayCursorMode | "done" | null;
export type ChannelNodeStatusValue = "done" | "open" | "overload" | "pending";
export type FutureNodePresenceValue = "hidden" | "visible";
export type FutureNodeStatusValue = "pending" | "settled";
export type ScopeGroupStatusValue = "closed" | "running" | null;

export function isInterruptedWaitLink<TEvent extends ExplorerEventId>(
  link: FlowScene<TEvent>["links"][number],
  state: ExplorerReplayState<TEvent>,
): boolean {
  return (
    link.variant === "wait" &&
    readLinkMode(link.activeEvents, state) === null &&
    link.interruption.kind === "interruptible" &&
    includesAny(state.completed, link.interruption.events)
  );
}

export function isSettledDataLink<TEvent extends ExplorerEventId>(
  link: FlowScene<TEvent>["links"][number],
  state: ExplorerReplayState<TEvent>,
): boolean {
  return (
    link.variant === "data" &&
    readLinkMode(link.activeEvents, state) === null &&
    includesAny(state.completed, link.activeEvents)
  );
}

export function isSettledWaitLink<TEvent extends ExplorerEventId>(
  link: FlowScene<TEvent>["links"][number],
  state: ExplorerReplayState<TEvent>,
): boolean {
  return (
    link.variant === "wait" &&
    readLinkMode(link.activeEvents, state) === null &&
    includesAny(state.completed, link.activeEvents)
  );
}

export function isSpawnLinkConsumed<TEvent extends ExplorerEventId>(
  link: FlowScene<TEvent>["links"][number],
  scene: FlowScene<TEvent>,
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
  node: FlowNode<TEvent>,
  state: ExplorerReplayState<TEvent>,
): FlowNodeStatusValue {
  if (node.variant === "channel") {
    return null;
  }

  if (node.variant === "future") {
    return null;
  }

  if (includesAny(state.completed, node.completedEvents)) {
    return "done";
  }

  const activeCursor = state.cursors.find(
    (cursor) =>
      node.statusTargetIds.includes(cursor.targetId) &&
      includesAny(cursor.events, node.activeEvents),
  );

  return activeCursor?.mode ?? null;
}

export function readFutureNodeStatus<TEvent extends ExplorerEventId>(
  node: FlowNode<TEvent>,
  state: ExplorerReplayState<TEvent>,
): FutureNodeStatusValue {
  if (node.variant !== "future") {
    return "pending";
  }

  if (includesAny(state.completed, node.completedEvents)) {
    return "settled";
  }

  return "pending";
}

export function readFutureNodePresence<TEvent extends ExplorerEventId>(
  node: FlowNode<TEvent>,
  state: ExplorerReplayState<TEvent>,
): FutureNodePresenceValue {
  if (node.variant !== "future") {
    return "hidden";
  }

  if (
    includesAny(state.active, node.activeEvents) ||
    includesAny(state.completed, node.activeEvents) ||
    includesAny(state.completed, node.completedEvents)
  ) {
    return "visible";
  }

  return "hidden";
}

export function readScopeGroupStatus<TEvent extends ExplorerEventId>(
  group: FlowScene<TEvent>["groups"][number],
  state: ExplorerReplayState<TEvent>,
): ScopeGroupStatusValue {
  if (includesAny(state.completed, group.closedEvents)) {
    return "closed";
  }

  if (
    includesAny(state.active, group.activeEvents) ||
    includesAny(state.completed, group.activeEvents)
  ) {
    return "running";
  }

  return null;
}

export function readChannelNodeStatus<TEvent extends ExplorerEventId>(
  node: FlowNode<TEvent>,
  state: ExplorerReplayState<TEvent>,
): ChannelNodeStatusValue {
  if (
    node.variant === "channel" &&
    node.channelState.kind === "metered" &&
    includesAny(state.active, node.channelState.overloadEvents)
  ) {
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

export function readChannelMeterLabel<TEvent extends ExplorerEventId>(
  node: FlowNode<TEvent>,
  state: ExplorerReplayState<TEvent>,
): string | null {
  if (node.variant !== "channel" || node.channelState.kind === "plain") {
    return null;
  }

  const matchedState = node.channelState.states.find((meterState) => {
    if (meterState.kind === "active") {
      return includesAny(state.active, meterState.events);
    }

    return includesAny(state.completed, meterState.events);
  });

  return matchedState?.label ?? node.channelState.defaultLabel;
}

function includesAny<TEvent extends ExplorerEventId>(
  completedEvents: readonly TEvent[],
  targetEvents: readonly TEvent[],
): boolean {
  return targetEvents.some((event) => completedEvents.includes(event));
}
