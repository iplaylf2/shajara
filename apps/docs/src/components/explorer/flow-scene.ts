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

const callerColumnX = 68;
const coordinatorColumnX = 394;
const workerColumnX = 680;
const channelX = 334;
const futureX = 350;
const scopedChannelX = 362;
const scopedFutureX = 574;
const futureWorkerColumnX = 506;
const topLaneY = 48;
const centerLaneY = 76;
const bottomLaneY = 156;
const auxiliaryLaneY = 164;
const futureLaneY = auxiliaryLaneY;
const scopedChannelLaneY = 204;
const scopedFutureLaneY = 195;
const callerColumn = 0;
const coordinatorColumn = 1;
const workerColumn = 2;
const futureWorkerColumn = 3;
const topLaneIndex = 0;
const centerLaneIndex = 1;
const bottomLaneIndex = 2;
const workerNodeHeight = 80;
const workerNodeWidth = 248;
const channelNodeHeight = 54;
const channelNodeWidth = 144;
const futureWorkerNodeHeight = 108;
const futureWorkerNodeWidth = 214;
const futureNodeHeight = 72;
const futureNodeWidth = 84;
const tallNodeHeight = 154;
const callerNodeWidth = 214;
const coordinatorNodeWidth = 154;
const halfDivisor = 2;
const firstWorkerIndex = 0;
const noFutureNodeCount = 0;
const noCoordinatorNodeCount = 0;
const noScopeNodeCount = 0;
const singleWorkerCount = 1;
const pairedWorkerCount = 2;

const defaultLayout = {
  columns: [callerColumnX, coordinatorColumnX, workerColumnX, futureWorkerColumnX],
  lanes: [topLaneY, centerLaneY, bottomLaneY],
  markerId: "explorer-flow-arrow",
} as const;

const nodeSize = {
  caller: { height: tallNodeHeight, width: callerNodeWidth },
  channel: { height: channelNodeHeight, width: channelNodeWidth },
  coordinator: { height: tallNodeHeight, width: coordinatorNodeWidth },
  future: { height: futureNodeHeight, width: futureNodeWidth },
  scope: { height: 0, width: 0 },
  worker: { height: workerNodeHeight, width: workerNodeWidth },
} as const satisfies Record<
  FlowNodeSpec<ExplorerEventId>["kind"],
  { readonly height: number; readonly width: number }
>;

function resolveNodeLayout<TEvent extends ExplorerEventId>(
  graphNodes: readonly FlowNodeSpec<TEvent>[],
): FlowNode<TEvent>[] {
  const callerNodes = graphNodes.filter((node) => node.kind === "caller");
  const channelNodes = graphNodes.filter((node) => node.kind === "channel");
  const coordinatorNodes = graphNodes.filter((node) => node.kind === "coordinator");
  const futureNodes = graphNodes.filter((node) => node.kind === "future");
  const scopeNodes = graphNodes.filter((node) => node.kind === "scope");
  const workerNodes = graphNodes.filter((node) => node.kind === "worker");
  const resolvedCenterLane = readCenterLane(workerNodes.length);
  const hasFutureNode = futureNodes.length > noFutureNodeCount;
  const hasCoordinatorNode = coordinatorNodes.length > noCoordinatorNodeCount;
  const hasScopeNode = scopeNodes.length > noScopeNodeCount;

  return [
    ...callerNodes.map((node) => createFlowNode(node, resolvedCenterLane, callerColumn)),
    ...channelNodes.map((node) => createAuxiliaryChannelNode(node, { hasScopeNode })),
    ...futureNodes.map((node) => createAuxiliaryFutureNode(node, { hasScopeNode })),
    ...workerNodes.map((node, index) =>
      createWorkerFlowNode(
        node,
        readWorkerLane(index, workerNodes.length),
        readWorkerColumn({ hasCoordinatorNode, hasFutureNode, hasScopeNode }),
        { hasCoordinatorNode, hasFutureNode, hasScopeNode },
      ),
    ),
    ...coordinatorNodes.map((node) => createFlowNode(node, resolvedCenterLane, coordinatorColumn)),
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

function createWorkerFlowNode<TEvent extends ExplorerEventId>(
  node: FlowNodeSpec<TEvent>,
  lane: number,
  column: number,
  options: WorkerColumnOptions,
): FlowNode<TEvent> {
  const left = defaultLayout.columns[column]!;
  const top = defaultLayout.lanes[lane]!;
  const size = readWorkerNodeSize(options);

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
      statusTargetIds: node.statusTargetIds,
      variant: node.kind,
    };
  }

  if (node.kind === "future") {
    return {
      ...positionedNode,
      statusTargetIds: node.statusTargetIds,
      variant: node.kind,
    };
  }

  if (node.kind === "scope") {
    throw new Error("Scope nodes are resolved as flow groups.");
  }

  return {
    ...positionedNode,
    statusTargetIds: node.statusTargetIds,
    variant: node.kind,
  };
}

function readCenterLane(workerCount: number): number {
  if (workerCount <= singleWorkerCount) {
    return centerLaneIndex;
  }

  if (workerCount > defaultLayout.lanes.length) {
    throw new Error("Too many explorer flow workers.");
  }

  return Math.floor(workerCount / halfDivisor);
}

function readWorkerLane(index: number, workerCount: number): number {
  if (workerCount <= singleWorkerCount) {
    return centerLaneIndex;
  }

  if (workerCount === pairedWorkerCount) {
    return index === firstWorkerIndex ? topLaneIndex : bottomLaneIndex;
  }

  return index;
}

function readWorkerColumn(options: WorkerColumnOptions): number {
  if (options.hasCoordinatorNode) {
    return workerColumn;
  }

  if (options.hasFutureNode) {
    if (options.hasScopeNode) {
      return coordinatorColumn;
    }

    return futureWorkerColumn;
  }

  return coordinatorColumn;
}

function readWorkerNodeSize(options: WorkerColumnOptions): FlowNodeSize {
  if (options.hasFutureNode && !options.hasCoordinatorNode && !options.hasScopeNode) {
    return {
      height: futureWorkerNodeHeight,
      width: futureWorkerNodeWidth,
    };
  }

  return nodeSize.worker;
}

interface WorkerColumnOptions {
  readonly hasCoordinatorNode: boolean;
  readonly hasFutureNode: boolean;
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
