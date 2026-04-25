// oxlint-disable no-magic-numbers
import type {
  ExplorerFlowGraph,
  ExplorerFlowGraphLink,
  ExplorerFlowGraphNode,
} from "#/domain/explorer/contract";

export function resolveExplorerFlowScene<TEvent extends string>(
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

export interface ExplorerFlowLink<TEvent extends string = string> {
  activeEvents: readonly TEvent[];
  label: string;
  labelLeft: number;
  labelTop: number;
  path: string;
}

export interface ExplorerFlowNode<TEvent extends string = string> {
  activeEvents: readonly TEvent[];
  completedEvents: readonly TEvent[];
  height: number;
  id: string;
  label: string;
  left: number;
  statusRoutineIds: readonly string[];
  top: number;
  variant: "branch" | "join" | "parent";
  width: number;
}

export interface ExplorerFlowScene<TEvent extends string = string> {
  ariaLabel: string;
  links: readonly ExplorerFlowLink<TEvent>[];
  markerId: string;
  nodes: readonly ExplorerFlowNode<TEvent>[];
  viewBox: string;
}

const defaultLayout = {
  columns: [44, 284, 608],
  lanes: [44, 58, 134],
  markerId: "explorer-flow-arrow",
  viewBox: "24 34 772 178",
} as const;

const nodeSize = {
  branch: { height: 58, width: 188 },
  join: { height: 146, width: 156 },
  parent: { height: 146, width: 156 },
} as const satisfies Record<ExplorerFlowNode["variant"], { height: number; width: number }>;
const flowLinkLabelOffsetY = 16;
const linkControlFromOffsetX = 72;
const linkControlToOffsetX = 78;

function resolveNodeLayout<TEvent extends string>(
  graphNodes: readonly ExplorerFlowGraphNode<TEvent>[],
): ExplorerFlowNode<TEvent>[] {
  const parentNodes = graphNodes.filter((node) => node.kind === "parent");
  const branchNodes = graphNodes.filter((node) => node.kind === "branch");
  const joinNodes = graphNodes.filter((node) => node.kind === "join");
  const centerLane = readCenterLane(branchNodes.length);

  return [
    ...parentNodes.map((node) => createFlowNode(node, 0, centerLane)),
    ...branchNodes.map((node, index) =>
      createFlowNode(node, 1, readBranchLane(index, branchNodes.length)),
    ),
    ...joinNodes.map((node) => createFlowNode(node, 2, centerLane)),
  ];
}

function createFlowNode<TEvent extends string>(
  node: ExplorerFlowGraphNode<TEvent>,
  column: number,
  lane: number,
): ExplorerFlowNode<TEvent> {
  const left = readColumn(column);
  const top = readLane(lane);
  const size = nodeSize[node.kind];

  return {
    activeEvents: node.activeEvents,
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

function createFlowLink<TEvent extends string>(
  link: ExplorerFlowGraphLink<TEvent>,
  nodePositions: ReadonlyMap<string, ExplorerFlowNode<TEvent>>,
): ExplorerFlowLink<TEvent> {
  const from = readNode(nodePositions, link.from);
  const to = readNode(nodePositions, link.to);
  const fromX = from.left + from.width;
  const fromY = readFlowLinkY(from, to);
  const toX = to.left;
  const toY = readFlowLinkY(to, from);
  const labelLeft = readCurveMidpoint(
    fromX,
    fromX + linkControlFromOffsetX,
    toX - linkControlToOffsetX,
    toX,
  );
  const labelTop = readCurveMidpoint(fromY, fromY, toY, toY) - flowLinkLabelOffsetY;

  return {
    activeEvents: link.activeEvents,
    label: link.label,
    labelLeft,
    labelTop,
    path: [
      `M${fromX} ${fromY}`,
      `C${fromX + linkControlFromOffsetX} ${fromY}`,
      `${toX - linkControlToOffsetX} ${toY}`,
      `${toX} ${toY}`,
    ].join(" "),
  };
}

function readFlowLinkY<TEvent extends string>(
  node: ExplorerFlowNode<TEvent>,
  peerNode: ExplorerFlowNode<TEvent>,
): number {
  const peerCenterY = peerNode.top + peerNode.height / 2;
  const nodeTop = node.top + node.height * 0.22;
  const nodeBottom = node.top + node.height * 0.78;

  return Math.min(nodeBottom, Math.max(nodeTop, peerCenterY));
}

function readCurveMidpoint(
  start: number,
  startControl: number,
  endControl: number,
  end: number,
): number {
  return (start + 3 * startControl + 3 * endControl + end) / 8;
}

function readNode<TEvent extends string>(
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
  if (branchCount <= 1) {
    return 1;
  }

  return Math.min(defaultLayout.lanes.length - 1, Math.floor(branchCount / 2));
}

function readBranchLane(index: number, branchCount: number): number {
  if (branchCount <= 1) {
    return 1;
  }

  if (branchCount === 2) {
    return index === 0 ? 0 : 2;
  }

  return Math.min(index, defaultLayout.lanes.length - 1);
}

function readColumn(column: number): number {
  const left = defaultLayout.columns[column];

  if (typeof left !== "number") {
    throw new TypeError(`Unknown flow column: ${String(column)}`);
  }

  return left;
}

function readLane(lane: number): number {
  const top = defaultLayout.lanes[lane];

  if (typeof top !== "number") {
    throw new TypeError(`Unknown flow lane: ${String(lane)}`);
  }

  return top;
}
