import type {
  ExplorerEventId,
  ExplorerFlowGraph,
  ExplorerFlowGraphLink,
  ExplorerFlowGraphNode,
} from "#/domain/explorer/contract";

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
    viewBox: defaultLayout.viewBox,
  };
}

export interface ExplorerFlowLink<TEvent extends ExplorerEventId> {
  activeEvents: readonly TEvent[];
  from: string;
  label: string;
  labelX: number;
  labelY: number;
  path: string;
  to: string;
  variant: "dependency" | "spawn";
  visibleLabel?: string;
}

export interface ExplorerFlowNode<TEvent extends ExplorerEventId> {
  activeEvents: readonly TEvent[];
  completedEvents: readonly TEvent[];
  centerY: number;
  height: number;
  id: string;
  label: string;
  left: number;
  statusRoutineIds: readonly string[];
  top: number;
  variant: "branch" | "join" | "parent";
  width: number;
}

export interface ExplorerFlowScene<TEvent extends ExplorerEventId> {
  ariaLabel: string;
  links: readonly ExplorerFlowLink<TEvent>[];
  markerId: string;
  nodes: readonly ExplorerFlowNode<TEvent>[];
  viewBox: string;
}

const parentColumnX = 68;
const branchColumnX = 394;
const joinColumnX = 680;
const topLaneY = 48;
const centerLaneY = 76;
const bottomLaneY = 156;
const parentColumn = 0;
const branchColumn = 1;
const joinColumn = 2;
const topLaneIndex = 0;
const centerLaneIndex = 1;
const bottomLaneIndex = 2;
const branchNodeHeight = 68;
const branchNodeWidth = 248;
const tallNodeHeight = 154;
const parentNodeWidth = 214;
const joinNodeWidth = 154;
const halfDivisor = 2;
const forwardDirection = 1;
const backwardDirection = -1;
const firstBranchIndex = 0;
const singleBranchCount = 1;
const pairedBranchCount = 2;
const linkAnchorInsetRatio = 0.22;
const linkAnchorOutsetRatio = 0.78;
const linkControlFromOffsetX = 76;
const linkControlToOffsetX = 84;

const defaultLayout = {
  columns: [parentColumnX, branchColumnX, joinColumnX],
  lanes: [topLaneY, centerLaneY, bottomLaneY],
  markerId: "explorer-flow-arrow",
  viewBox: "24 24 650 224",
} as const;

const flowColumns = {
  branch: branchColumn,
  join: joinColumn,
  parent: parentColumn,
} as const satisfies Record<ExplorerFlowNodeVariant, FlowColumn>;

const nodeSize = {
  branch: { height: branchNodeHeight, width: branchNodeWidth },
  join: { height: tallNodeHeight, width: joinNodeWidth },
  parent: { height: tallNodeHeight, width: parentNodeWidth },
} as const satisfies Record<ExplorerFlowNodeVariant, ExplorerFlowNodeSize>;

type ExplorerFlowNodeVariant = ExplorerFlowNode<ExplorerEventId>["variant"];
type FlowColumn = typeof parentColumn | typeof branchColumn | typeof joinColumn;
type FlowLane = typeof topLaneIndex | typeof centerLaneIndex | typeof bottomLaneIndex;
type FlowLinkDirection = typeof forwardDirection | typeof backwardDirection;
interface ExplorerFlowNodeSize {
  readonly height: number;
  readonly width: number;
}

function resolveNodeLayout<TEvent extends ExplorerEventId>(
  graphNodes: readonly ExplorerFlowGraphNode<TEvent>[],
): ExplorerFlowNode<TEvent>[] {
  const parentNodes = graphNodes.filter((node) => node.kind === "parent");
  const branchNodes = graphNodes.filter((node) => node.kind === "branch");
  const joinNodes = graphNodes.filter((node) => node.kind === "join");
  const resolvedCenterLane = readCenterLane(branchNodes.length);

  return [
    ...parentNodes.map((node) => createFlowNode(node, resolvedCenterLane)),
    ...branchNodes.map((node, index) =>
      createFlowNode(node, readBranchLane(index, branchNodes.length)),
    ),
    ...joinNodes.map((node) => createFlowNode(node, resolvedCenterLane)),
  ];
}

function createFlowNode<TEvent extends ExplorerEventId>(
  node: ExplorerFlowGraphNode<TEvent>,
  lane: FlowLane,
): ExplorerFlowNode<TEvent> {
  const left = readColumn(flowColumns[node.kind]);
  const top = readLane(lane);
  const size = nodeSize[node.kind];
  const centerY = top + size.height / halfDivisor;

  return {
    activeEvents: node.activeEvents,
    centerY,
    completedEvents: node.completedEvents,
    height: size.height,
    id: node.id,
    label: node.label,
    left,
    statusRoutineIds: node.statusRoutineIds,
    top,
    variant: node.kind,
    width: size.width,
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

  return {
    activeEvents: link.activeEvents,
    from: link.from,
    label: link.label,
    labelX: (fromX + toX) / halfDivisor,
    labelY: (fromY + toY) / halfDivisor,
    path: [
      `M${fromX} ${fromY}`,
      `C${fromX + direction * linkControlFromOffsetX} ${fromY}`,
      `${toX - direction * linkControlToOffsetX} ${toY}`,
      `${toX} ${toY}`,
    ].join(" "),
    to: link.to,
    variant: link.kind,
    ...(link.visibleLabel ? { visibleLabel: link.visibleLabel } : {}),
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

function readCenterLane(branchCount: number): FlowLane {
  if (branchCount <= singleBranchCount) {
    return centerLaneIndex;
  }

  if (branchCount > defaultLayout.lanes.length) {
    throw new Error(
      `Explorer flow layout supports at most ${defaultLayout.lanes.length} branches.`,
    );
  }

  return Math.floor(branchCount / halfDivisor) as FlowLane;
}

function readBranchLane(index: number, branchCount: number): FlowLane {
  if (branchCount <= singleBranchCount) {
    return centerLaneIndex;
  }

  if (branchCount === pairedBranchCount) {
    return index === firstBranchIndex ? topLaneIndex : bottomLaneIndex;
  }

  if (branchCount > defaultLayout.lanes.length) {
    throw new Error(
      `Explorer flow layout supports at most ${defaultLayout.lanes.length} branches.`,
    );
  }

  return index as FlowLane;
}

function readColumn(column: FlowColumn): number {
  return defaultLayout.columns[column];
}

function readLane(lane: FlowLane): number {
  return defaultLayout.lanes[lane];
}
