import type { ExplorerEventId, ExplorerFlowLink } from "#/domain/explorer/contract";
import type { FlowLink, FlowNode } from "./flow-model";
import { resolveFlowLinkPath } from "./flow-link-path";

export function createFlowLink<TEvent extends ExplorerEventId>(
  link: ExplorerFlowLink<TEvent>,
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

export type FlowLinkDirection = typeof FORWARD_DIRECTION | typeof BACKWARD_DIRECTION;

function readFlowLinkDirection<TEvent extends ExplorerEventId>(
  from: FlowNode<TEvent>,
  to: FlowNode<TEvent>,
): FlowLinkDirection {
  const fromCenterX = from.left + from.width / HALF_DIVISOR;
  const toCenterX = to.left + to.width / HALF_DIVISOR;

  return fromCenterX <= toCenterX ? FORWARD_DIRECTION : BACKWARD_DIRECTION;
}

function readFlowLinkFromX<TEvent extends ExplorerEventId>(
  node: FlowNode<TEvent>,
  direction: FlowLinkDirection,
): number {
  if (node.variant === "future") {
    return readFutureLinkX(node, direction);
  }

  return direction === FORWARD_DIRECTION ? node.left + node.width : node.left;
}

function readFlowLinkToX<TEvent extends ExplorerEventId>(
  node: FlowNode<TEvent>,
  direction: FlowLinkDirection,
): number {
  if (node.variant === "future") {
    return readFutureLinkX(node, reverseFlowLinkDirection(direction));
  }

  return direction === FORWARD_DIRECTION ? node.left : node.left + node.width;
}

function reverseFlowLinkDirection(direction: FlowLinkDirection): FlowLinkDirection {
  return direction === FORWARD_DIRECTION ? BACKWARD_DIRECTION : FORWARD_DIRECTION;
}

function readFutureLinkX<TEvent extends ExplorerEventId>(
  node: FlowNode<TEvent>,
  direction: FlowLinkDirection,
): number {
  const centerX = node.left + node.width / HALF_DIVISOR;

  return centerX + direction * FUTURE_TARGET_OUTER_RADIUS;
}

function readFlowLinkY<TEvent extends ExplorerEventId>(
  node: FlowNode<TEvent>,
  peerNode: FlowNode<TEvent>,
): number {
  if (node.variant === "channel" || node.variant === "future") {
    return node.centerY;
  }

  const peerCenterY = peerNode.top + peerNode.height / HALF_DIVISOR;
  const nodeTop = node.top + node.height * LINK_ANCHOR_INSET_RATIO;
  const nodeBottom = node.top + node.height * LINK_ANCHOR_OUTSET_RATIO;

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

const BACKWARD_DIRECTION = -1;
const FORWARD_DIRECTION = 1;
const FUTURE_TARGET_OUTER_RADIUS = 32;
const HALF_DIVISOR = 2;
const LINK_ANCHOR_INSET_RATIO = 0.22;
const LINK_ANCHOR_OUTSET_RATIO = 0.78;
