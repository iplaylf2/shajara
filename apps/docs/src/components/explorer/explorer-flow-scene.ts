import type {
  ExplorerEventId,
  ExplorerFlowGraph,
  ExplorerFlowGraphLink,
  ExplorerFlowGraphNode,
} from "#/domain/explorer/contract";
import type {
  ExplorerFlowLink,
  ExplorerFlowNode,
  ExplorerFlowScene,
} from "./explorer-flow-contract";
import { readFlowViewBox } from "./explorer-flow-view-box";
import { resolveFlowLinkPath } from "./explorer-flow-link-path";

export function resolveExplorerFlowScene<TEvent extends ExplorerEventId>(
  graph: ExplorerFlowGraph<TEvent>,
  ariaLabel: string,
): ExplorerFlowScene<TEvent> {
  const nodes = resolveNodeLayout(graph.nodes);
  const nodePositions = new Map(nodes.map((node) => [node.id, node]));
  const links = graph.links.map((link) => createFlowLink(link, nodePositions));

  return {
    ariaLabel,
    links,
    markerId: defaultLayout.markerId,
    nodes,
    viewBox: readFlowViewBox(nodes),
  };
}

const parentColumnX = 68;
const branchColumnX = 394;
const joinColumnX = 680;
const channelX = 334;
const topLaneY = 48;
const centerLaneY = 76;
const bottomLaneY = 156;
const auxiliaryLaneY = 164;
const parentColumn = 0;
const branchColumn = 1;
const joinColumn = 2;
const topLaneIndex = 0;
const centerLaneIndex = 1;
const bottomLaneIndex = 2;
const branchNodeHeight = 68;
const branchNodeWidth = 248;
const channelNodeHeight = 54;
const channelNodeWidth = 116;
const tallNodeHeight = 154;
const parentNodeWidth = 214;
const joinNodeWidth = 154;
const halfDivisor = 2;
const forwardDirection = 1;
const backwardDirection = -1;
const firstBranchIndex = 0;
const noJoinNodeCount = 0;
const singleBranchCount = 1;
const pairedBranchCount = 2;
const linkAnchorInsetRatio = 0.22;
const linkAnchorOutsetRatio = 0.78;

const defaultLayout = {
  columns: [parentColumnX, branchColumnX, joinColumnX],
  lanes: [topLaneY, centerLaneY, bottomLaneY],
  markerId: "explorer-flow-arrow",
} as const;

const nodeSize = {
  branch: { height: branchNodeHeight, width: branchNodeWidth },
  channel: { height: channelNodeHeight, width: channelNodeWidth },
  join: { height: tallNodeHeight, width: joinNodeWidth },
  parent: { height: tallNodeHeight, width: parentNodeWidth },
} as const satisfies Record<
  ExplorerFlowGraphNode<ExplorerEventId>["kind"],
  { readonly height: number; readonly width: number }
>;

export type FlowLinkDirection = typeof forwardDirection | typeof backwardDirection;

function resolveNodeLayout<TEvent extends ExplorerEventId>(
  graphNodes: readonly ExplorerFlowGraphNode<TEvent>[],
): ExplorerFlowNode<TEvent>[] {
  const parentNodes = graphNodes.filter((node) => node.kind === "parent");
  const branchNodes = graphNodes.filter((node) => node.kind === "branch");
  const channelNodes = graphNodes.filter((node) => node.kind === "channel");
  const joinNodes = graphNodes.filter((node) => node.kind === "join");
  const resolvedCenterLane = readCenterLane(branchNodes.length);
  const hasJoinNode = joinNodes.length > noJoinNodeCount;

  return [
    ...parentNodes.map((node) => createFlowNode(node, resolvedCenterLane, parentColumn)),
    ...channelNodes.map((node) => createAuxiliaryChannelNode(node)),
    ...branchNodes.map((node, index) =>
      createFlowNode(
        node,
        readBranchLane(index, branchNodes.length),
        readBranchColumn(hasJoinNode),
      ),
    ),
    ...joinNodes.map((node) =>
      createFlowNode(node, resolvedCenterLane, hasJoinNode ? branchColumn : joinColumn),
    ),
  ];
}

function createAuxiliaryChannelNode<TEvent extends ExplorerEventId>(
  node: ExplorerFlowGraphNode<TEvent>,
): ExplorerFlowNode<TEvent> {
  return createPositionedFlowNode(node, channelX, auxiliaryLaneY);
}

function createFlowNode<TEvent extends ExplorerEventId>(
  node: ExplorerFlowGraphNode<TEvent>,
  lane: number,
  column: number,
): ExplorerFlowNode<TEvent> {
  const left = defaultLayout.columns[column]!;
  const top = defaultLayout.lanes[lane]!;

  return createPositionedFlowNode(node, left, top);
}

function createPositionedFlowNode<TEvent extends ExplorerEventId>(
  node: ExplorerFlowGraphNode<TEvent>,
  left: number,
  top: number,
): ExplorerFlowNode<TEvent> {
  const size = nodeSize[node.kind];
  const centerY = top + size.height / halfDivisor;

  const positionedNode = {
    activeEvents: node.activeEvents,
    centerY,
    completedEvents: node.completedEvents,
    height: size.height,
    id: node.id,
    label: node.label,
    left,
    top,
    width: size.width,
  };

  if (node.kind === "channel") {
    return {
      ...positionedNode,
      channelState: node.channelState,
      statusRoutineIds: node.statusRoutineIds,
      variant: node.kind,
    };
  }

  return {
    ...positionedNode,
    statusRoutineIds: node.statusRoutineIds,
    variant: node.kind,
  };
}

function createFlowLink<TEvent extends ExplorerEventId>(
  link: ExplorerFlowGraphLink<TEvent>,
  nodePositions: ReadonlyMap<string, ExplorerFlowNode<TEvent>>,
): ExplorerFlowLink<TEvent> {
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

function readFlowLinkDirection<TEvent extends ExplorerEventId>(
  from: ExplorerFlowNode<TEvent>,
  to: ExplorerFlowNode<TEvent>,
): FlowLinkDirection {
  const fromCenterX = from.left + from.width / halfDivisor;
  const toCenterX = to.left + to.width / halfDivisor;

  return fromCenterX <= toCenterX ? forwardDirection : backwardDirection;
}

function readFlowLinkFromX<TEvent extends ExplorerEventId>(
  node: ExplorerFlowNode<TEvent>,
  direction: FlowLinkDirection,
): number {
  return direction === forwardDirection ? node.left + node.width : node.left;
}

function readFlowLinkToX<TEvent extends ExplorerEventId>(
  node: ExplorerFlowNode<TEvent>,
  direction: FlowLinkDirection,
): number {
  return direction === forwardDirection ? node.left : node.left + node.width;
}

function readFlowLinkY<TEvent extends ExplorerEventId>(
  node: ExplorerFlowNode<TEvent>,
  peerNode: ExplorerFlowNode<TEvent>,
): number {
  if (node.variant === "channel") {
    return node.centerY;
  }

  const peerCenterY = peerNode.top + peerNode.height / halfDivisor;
  const nodeTop = node.top + node.height * linkAnchorInsetRatio;
  const nodeBottom = node.top + node.height * linkAnchorOutsetRatio;

  return Math.min(nodeBottom, Math.max(nodeTop, peerCenterY));
}

function readNode<TEvent extends ExplorerEventId>(
  nodePositions: ReadonlyMap<string, ExplorerFlowNode<TEvent>>,
  nodeId: string,
): ExplorerFlowNode<TEvent> {
  const node = nodePositions.get(nodeId);

  if (!node) {
    throw new Error(`Unknown flow node: ${nodeId}`);
  }

  return node;
}

function readCenterLane(branchCount: number): number {
  if (branchCount <= singleBranchCount) {
    return centerLaneIndex;
  }

  if (branchCount > defaultLayout.lanes.length) {
    throw new Error("Too many explorer flow branches.");
  }

  return Math.floor(branchCount / halfDivisor);
}

function readBranchLane(index: number, branchCount: number): number {
  if (branchCount <= singleBranchCount) {
    return centerLaneIndex;
  }

  if (branchCount === pairedBranchCount) {
    return index === firstBranchIndex ? topLaneIndex : bottomLaneIndex;
  }

  return index;
}

function readBranchColumn(hasJoinNode: boolean): number {
  return hasJoinNode ? joinColumn : branchColumn;
}
