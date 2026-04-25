// oxlint-disable no-magic-numbers
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
  label: string;
  labelLeft: number;
  labelTop: number;
  path: string;
}

export interface ExplorerFlowNode<TEvent extends ExplorerEventId> {
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

export interface ExplorerFlowScene<TEvent extends ExplorerEventId> {
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

const flowColumns = {
  branch: 1,
  join: 2,
  parent: 0,
} as const satisfies Record<ExplorerFlowNodeVariant, FlowColumn>;

const nodeSize = {
  branch: { height: 58, width: 188 },
  join: { height: 146, width: 156 },
  parent: { height: 146, width: 156 },
} as const satisfies Record<ExplorerFlowNodeVariant, ExplorerFlowNodeSize>;
const flowLinkLabelOffsetY = 16;
const linkControlFromOffsetX = 72;
const linkControlToOffsetX = 78;

type ExplorerFlowNodeVariant = ExplorerFlowNode<ExplorerEventId>["variant"];
type FlowColumn = 0 | 1 | 2;
type FlowLane = 0 | 1 | 2;
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
  const centerLane = readCenterLane(branchNodes.length);

  return [
    ...parentNodes.map((node) => createFlowNode(node, centerLane)),
    ...branchNodes.map((node, index) =>
      createFlowNode(node, readBranchLane(index, branchNodes.length)),
    ),
    ...joinNodes.map((node) => createFlowNode(node, centerLane)),
  ];
}

function createFlowNode<TEvent extends ExplorerEventId>(
  node: ExplorerFlowGraphNode<TEvent>,
  lane: FlowLane,
): ExplorerFlowNode<TEvent> {
  const left = readColumn(flowColumns[node.kind]);
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

function createFlowLink<TEvent extends ExplorerEventId>(
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

function readFlowLinkY<TEvent extends ExplorerEventId>(
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
  if (branchCount <= 1) {
    return 1;
  }

  if (branchCount > defaultLayout.lanes.length) {
    throw new Error(
      `Explorer flow layout supports at most ${defaultLayout.lanes.length} branches.`,
    );
  }

  return Math.floor(branchCount / 2) as FlowLane;
}

function readBranchLane(index: number, branchCount: number): FlowLane {
  if (branchCount <= 1) {
    return 1;
  }

  if (branchCount === 2) {
    return index === 0 ? 0 : 2;
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
