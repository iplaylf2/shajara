// oxlint-disable no-magic-numbers
import type {
  ExplorerFlowGraph,
  ExplorerFlowGraphLink,
  ExplorerFlowGraphNode,
  ExplorerFlowGraphTick,
} from "#/domain/explorer/contract";

export function resolveExplorerFlowScene<TEvent extends string>(
  graph: ExplorerFlowGraph<TEvent>,
  ariaLabel: string,
): ExplorerFlowScene<TEvent> {
  const nodes = resolveNodeLayout(graph.nodes);
  const nodePositions = new Map(nodes.map((node) => [node.id, node]));

  return {
    ariaLabel,
    links: graph.links.map((link) => createFlowLink(link, nodePositions)),
    markerId: defaultLayout.markerId,
    nodes,
    ticks: graph.ticks.map((tick) => createFlowTick(tick, nodePositions)),
    viewBox: defaultLayout.viewBox,
  };
}

export interface ExplorerFlowLink<TEvent extends string = string> {
  activeEvents: readonly TEvent[];
  path: string;
}

export interface ExplorerFlowNode<TEvent extends string = string> {
  activeEvents: readonly TEvent[];
  completedEvents: readonly TEvent[];
  id: string;
  label: string;
  left: number;
  top: number;
  variant: "branch" | "join" | "parent";
}

export interface ExplorerFlowScene<TEvent extends string = string> {
  ariaLabel: string;
  links: readonly ExplorerFlowLink<TEvent>[];
  markerId: string;
  nodes: readonly ExplorerFlowNode<TEvent>[];
  ticks: readonly ExplorerFlowTick<TEvent>[];
  viewBox: string;
}

export interface ExplorerFlowTick<TEvent extends string = string> {
  label: string;
  left: number;
  top: number;
  visibleEvents: readonly TEvent[];
}

const defaultLayout = {
  columns: [98, 322, 574],
  lanes: [96, 138, 188],
  markerId: "explorer-flow-arrow",
  tickOffset: {
    left: 56,
    top: 80,
  },
  viewBox: "0 0 760 330",
} as const;

const nodeWidth = 112;
const nodeLinkAnchorY = {
  branch: 20,
  join: 18,
  parent: 18,
} as const satisfies Record<ExplorerFlowNode["variant"], number>;
const linkControlFromOffsetX = 38;
const linkControlToOffsetX = 46;

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
  return {
    activeEvents: node.activeEvents,
    completedEvents: node.completedEvents,
    id: node.id,
    label: node.label,
    left: readColumn(column),
    top: readLane(lane),
    variant: node.kind,
  };
}

function createFlowLink<TEvent extends string>(
  link: ExplorerFlowGraphLink<TEvent>,
  nodePositions: ReadonlyMap<string, ExplorerFlowNode<TEvent>>,
): ExplorerFlowLink<TEvent> {
  const from = readNode(nodePositions, link.from);
  const to = readNode(nodePositions, link.to);
  const fromX = from.left + nodeWidth;
  const fromY = from.top + nodeLinkAnchorY[from.variant];
  const toX = to.left;
  const toY = to.top + nodeLinkAnchorY[to.variant];

  return {
    activeEvents: link.activeEvents,
    path: [
      `M${fromX} ${fromY}`,
      `C${fromX + linkControlFromOffsetX} ${fromY}`,
      `${toX - linkControlToOffsetX} ${toY}`,
      `${toX} ${toY}`,
    ].join(" "),
  };
}

function createFlowTick<TEvent extends string>(
  tick: ExplorerFlowGraphTick<TEvent>,
  nodePositions: ReadonlyMap<string, ExplorerFlowNode<TEvent>>,
): ExplorerFlowTick<TEvent> {
  const node = readNode(nodePositions, tick.nodeId);

  return {
    label: tick.label,
    left: node.left + defaultLayout.tickOffset.left,
    top: node.top + defaultLayout.tickOffset.top,
    visibleEvents: tick.visibleEvents,
  };
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
