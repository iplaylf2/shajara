import type {
  ExplorerEventId,
  ExplorerFlow,
  ExplorerFlowNode as FlowNodeSpec,
} from "#/domain/explorer/contract";
import type { FlowNode, FlowScene } from "./flow-model";
import { createFlowLink } from "./flow-link-layout";
import { readFlowViewBox } from "./flow-view-box";
import { resolveScopeGroups } from "./flow-scope-group";

export function resolveFlowScene<TEvent extends ExplorerEventId>(
  graph: ExplorerFlow<TEvent>,
  ariaLabel: string,
): FlowScene<TEvent> {
  const nodes = resolveNodeLayout(graph.nodes);
  const nodePositions = new Map(nodes.map((node) => [node.id, node]));
  const groups = resolveScopeGroups(graph.nodes, nodePositions);
  const links = graph.links.map((link) => createFlowLink(link, nodePositions));

  return {
    ariaLabel,
    groups,
    links,
    markerId: defaultLayout.markerId,
    nodes,
    viewBox: readFlowViewBox([...groups, ...nodes]),
  };
}

const parentColumnX = 68;
const branchColumnX = 394;
const joinColumnX = 680;
const channelX = 334;
const futureX = 350;
const scopedChannelX = 362;
const scopedFutureX = 574;
const futureBranchColumnX = 506;
const topLaneY = 48;
const centerLaneY = 76;
const bottomLaneY = 156;
const auxiliaryLaneY = 164;
const futureLaneY = auxiliaryLaneY;
const scopedChannelLaneY = 204;
const scopedFutureLaneY = 195;
const parentColumn = 0;
const branchColumn = 1;
const joinColumn = 2;
const futureBranchColumn = 3;
const topLaneIndex = 0;
const centerLaneIndex = 1;
const bottomLaneIndex = 2;
const branchNodeHeight = 80;
const branchNodeWidth = 248;
const channelNodeHeight = 54;
const channelNodeWidth = 144;
const futureBranchNodeHeight = 108;
const futureBranchNodeWidth = 214;
const futureNodeHeight = 72;
const futureNodeWidth = 84;
const tallNodeHeight = 154;
const parentNodeWidth = 214;
const joinNodeWidth = 154;
const halfDivisor = 2;
const firstBranchIndex = 0;
const noFutureNodeCount = 0;
const noJoinNodeCount = 0;
const noScopeNodeCount = 0;
const singleBranchCount = 1;
const pairedBranchCount = 2;

const defaultLayout = {
  columns: [parentColumnX, branchColumnX, joinColumnX, futureBranchColumnX],
  lanes: [topLaneY, centerLaneY, bottomLaneY],
  markerId: "explorer-flow-arrow",
} as const;

const nodeSize = {
  branch: { height: branchNodeHeight, width: branchNodeWidth },
  channel: { height: channelNodeHeight, width: channelNodeWidth },
  future: { height: futureNodeHeight, width: futureNodeWidth },
  join: { height: tallNodeHeight, width: joinNodeWidth },
  parent: { height: tallNodeHeight, width: parentNodeWidth },
  scope: { height: 0, width: 0 },
} as const satisfies Record<
  FlowNodeSpec<ExplorerEventId>["kind"],
  { readonly height: number; readonly width: number }
>;

function resolveNodeLayout<TEvent extends ExplorerEventId>(
  graphNodes: readonly FlowNodeSpec<TEvent>[],
): FlowNode<TEvent>[] {
  const parentNodes = graphNodes.filter((node) => node.kind === "parent");
  const branchNodes = graphNodes.filter((node) => node.kind === "branch");
  const channelNodes = graphNodes.filter((node) => node.kind === "channel");
  const futureNodes = graphNodes.filter((node) => node.kind === "future");
  const joinNodes = graphNodes.filter((node) => node.kind === "join");
  const scopeNodes = graphNodes.filter((node) => node.kind === "scope");
  const resolvedCenterLane = readCenterLane(branchNodes.length);
  const hasFutureNode = futureNodes.length > noFutureNodeCount;
  const hasJoinNode = joinNodes.length > noJoinNodeCount;
  const hasScopeNode = scopeNodes.length > noScopeNodeCount;

  return [
    ...parentNodes.map((node) => createFlowNode(node, resolvedCenterLane, parentColumn)),
    ...channelNodes.map((node) => createAuxiliaryChannelNode(node, { hasScopeNode })),
    ...futureNodes.map((node) => createAuxiliaryFutureNode(node, { hasScopeNode })),
    ...branchNodes.map((node, index) =>
      createBranchFlowNode(
        node,
        readBranchLane(index, branchNodes.length),
        readBranchColumn({ hasFutureNode, hasJoinNode, hasScopeNode }),
        { hasFutureNode, hasJoinNode, hasScopeNode },
      ),
    ),
    ...joinNodes.map((node) =>
      createFlowNode(node, resolvedCenterLane, hasJoinNode ? branchColumn : joinColumn),
    ),
  ];
}

function createAuxiliaryChannelNode<TEvent extends ExplorerEventId>(
  node: FlowNodeSpec<TEvent>,
  options: AuxiliaryChannelOptions,
): FlowNode<TEvent> {
  if (options.hasScopeNode) {
    return createPositionedFlowNode(node, scopedChannelX, scopedChannelLaneY, {
      objectEnterFrom: "top",
    });
  }

  return createPositionedFlowNode(node, channelX, auxiliaryLaneY, { objectEnterFrom: "left" });
}

function createAuxiliaryFutureNode<TEvent extends ExplorerEventId>(
  node: FlowNodeSpec<TEvent>,
  options: AuxiliaryFutureOptions,
): FlowNode<TEvent> {
  if (options.hasScopeNode) {
    return createPositionedFlowNode(node, scopedFutureX, scopedFutureLaneY, {
      objectEnterFrom: "top",
    });
  }

  return createPositionedFlowNode(node, futureX, futureLaneY, { objectEnterFrom: "left" });
}

function createFlowNode<TEvent extends ExplorerEventId>(
  node: FlowNodeSpec<TEvent>,
  lane: number,
  column: number,
): FlowNode<TEvent> {
  const left = defaultLayout.columns[column]!;
  const top = defaultLayout.lanes[lane]!;

  return createPositionedFlowNode(node, left, top);
}

function createBranchFlowNode<TEvent extends ExplorerEventId>(
  node: FlowNodeSpec<TEvent>,
  lane: number,
  column: number,
  options: BranchColumnOptions,
): FlowNode<TEvent> {
  const left = defaultLayout.columns[column]!;
  const top = defaultLayout.lanes[lane]!;
  const size = readBranchNodeSize(options);

  return createPositionedFlowNode(node, left, top, { size });
}

function createPositionedFlowNode<TEvent extends ExplorerEventId>(
  node: FlowNodeSpec<TEvent>,
  left: number,
  top: number,
  options: FlowNodeLayoutOptions = {},
): FlowNode<TEvent> {
  const size = options.size ?? nodeSize[node.kind];
  const centerY = top + size.height / halfDivisor;

  const positionedNode = {
    activeEvents: node.activeEvents,
    centerY,
    completedEvents: node.completedEvents,
    height: size.height,
    id: node.id,
    label: node.label,
    left,
    ...(options.objectEnterFrom ? { objectEnterFrom: options.objectEnterFrom } : {}),
    top,
    width: size.width,
  };

  if (node.kind === "channel") {
    return {
      ...positionedNode,
      channelDirection: node.direction,
      channelState: node.channelState,
      statusRoutineIds: node.statusRoutineIds,
      variant: node.kind,
    };
  }

  if (node.kind === "future") {
    return {
      ...positionedNode,
      statusRoutineIds: node.statusRoutineIds,
      variant: node.kind,
    };
  }

  if (node.kind === "scope") {
    throw new Error("Scope nodes are resolved as flow groups.");
  }

  return {
    ...positionedNode,
    statusRoutineIds: node.statusRoutineIds,
    variant: node.kind,
  };
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

function readBranchColumn(options: BranchColumnOptions): number {
  if (options.hasJoinNode) {
    return joinColumn;
  }

  if (options.hasFutureNode) {
    if (options.hasScopeNode) {
      return branchColumn;
    }

    return futureBranchColumn;
  }

  return branchColumn;
}

function readBranchNodeSize(options: BranchColumnOptions): FlowNodeSize {
  if (options.hasFutureNode && !options.hasJoinNode && !options.hasScopeNode) {
    return {
      height: futureBranchNodeHeight,
      width: futureBranchNodeWidth,
    };
  }

  return nodeSize.branch;
}

interface BranchColumnOptions {
  readonly hasFutureNode: boolean;
  readonly hasJoinNode: boolean;
  readonly hasScopeNode: boolean;
}

interface AuxiliaryChannelOptions {
  readonly hasScopeNode: boolean;
}

interface AuxiliaryFutureOptions {
  readonly hasScopeNode: boolean;
}

interface FlowNodeLayoutOptions {
  readonly objectEnterFrom?: "left" | "top";
  readonly size?: FlowNodeSize;
}

interface FlowNodeSize {
  readonly height: number;
  readonly width: number;
}
