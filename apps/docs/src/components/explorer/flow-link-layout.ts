import type { ExplorerEventId, ExplorerFlowLink as FlowLinkSpec } from "#/domain/explorer/contract";
import type { FlowLink, FlowNode } from "./flow-model";
import { resolveFlowLinkPath } from "./flow-link-path";

export function createFlowLink<TEvent extends ExplorerEventId>(
  link: FlowLinkSpec<TEvent>,
  nodePositions: ReadonlyMap<string, FlowNode<TEvent>>,
): FlowLink<TEvent> {
  const from = readNode(nodePositions, link.from);
  const to = readNode(nodePositions, link.to);
  const direction = readFlowLinkDirection(from, to);
  const fromX = readFlowLinkFromX(from, direction);
  const fromY = readFlowLinkY(from, to);
  const toX = readFlowLinkToX(to, direction);
  const toY = readFlowLinkY(to, from);
  const renderedPath = resolveFlowLinkPath(link, { direction, from, fromX, fromY, to, toX, toY });

  return {
    activeEvents: link.activeEvents,
    displayLabel: link.displayLabel,
    from: link.from,
    interruption: link.kind === "wait" ? link.interruption : { kind: "none" },
    label: link.label,
    labelX: renderedPath.labelX,
    labelY: renderedPath.labelY,
    path: renderedPath.path,
    to: link.to,
    variant: link.kind,
  };
}

export type FlowLinkDirection = typeof forwardDirection | typeof backwardDirection;

function readFlowLinkDirection<TEvent extends ExplorerEventId>(
  from: FlowNode<TEvent>,
  to: FlowNode<TEvent>,
): FlowLinkDirection {
  const fromCenterX = from.left + from.width / halfDivisor;
  const toCenterX = to.left + to.width / halfDivisor;

  return fromCenterX <= toCenterX ? forwardDirection : backwardDirection;
}

function readFlowLinkFromX<TEvent extends ExplorerEventId>(
  node: FlowNode<TEvent>,
  direction: FlowLinkDirection,
): number {
  if (node.variant === "future") {
    return readFutureLinkX(node, direction);
  }

  return direction === forwardDirection ? node.left + node.width : node.left;
}

function readFlowLinkToX<TEvent extends ExplorerEventId>(
  node: FlowNode<TEvent>,
  direction: FlowLinkDirection,
): number {
  if (node.variant === "future") {
    return readFutureLinkX(node, -direction as FlowLinkDirection);
  }

  return direction === forwardDirection ? node.left : node.left + node.width;
}

function readFutureLinkX<TEvent extends ExplorerEventId>(
  node: FlowNode<TEvent>,
  direction: FlowLinkDirection,
): number {
  const centerX = node.left + node.width / halfDivisor;

  return centerX + direction * futureTargetOuterRadius;
}

function readFlowLinkY<TEvent extends ExplorerEventId>(
  node: FlowNode<TEvent>,
  peerNode: FlowNode<TEvent>,
): number {
  if (node.variant === "channel" || node.variant === "future") {
    return node.centerY;
  }

  const peerCenterY = peerNode.top + peerNode.height / halfDivisor;
  const nodeTop = node.top + node.height * linkAnchorInsetRatio;
  const nodeBottom = node.top + node.height * linkAnchorOutsetRatio;

  return Math.min(nodeBottom, Math.max(nodeTop, peerCenterY));
}

function readNode<TEvent extends ExplorerEventId>(
  nodePositions: ReadonlyMap<string, FlowNode<TEvent>>,
  nodeId: string,
): FlowNode<TEvent> {
  const node = nodePositions.get(nodeId);

  if (!node) {
    throw new Error(`Unknown flow node: ${nodeId}`);
  }

  return node;
}

const backwardDirection = -1;
const forwardDirection = 1;
const futureTargetOuterRadius = 32;
const halfDivisor = 2;
const linkAnchorInsetRatio = 0.22;
const linkAnchorOutsetRatio = 0.78;
