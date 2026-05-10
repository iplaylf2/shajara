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

const CALLER_COLUMN_X = 68;
const COORDINATOR_COLUMN_X = 394;
const WORKER_COLUMN_X = 680;
const CHANNEL_X = 334;
const FUTURE_X = 350;
const SCOPED_CHANNEL_X = 362;
const SCOPED_FUTURE_X = 574;
const FUTURE_WORKER_COLUMN_X = 506;
const TOP_LANE_Y = 48;
const CENTER_LANE_Y = 76;
const BOTTOM_LANE_Y = 156;
const AUXILIARY_LANE_Y = 164;
const futureLaneY = AUXILIARY_LANE_Y;
const SCOPED_CHANNEL_LANE_Y = 204;
const SCOPED_FUTURE_LANE_Y = 195;
const CALLER_COLUMN = 0;
const COORDINATOR_COLUMN = 1;
const WORKER_COLUMN = 2;
const FUTURE_WORKER_COLUMN = 3;
const TOP_LANE_INDEX = 0;
const CENTER_LANE_INDEX = 1;
const BOTTOM_LANE_INDEX = 2;
const WORKER_NODE_HEIGHT = 80;
const WORKER_NODE_WIDTH = 248;
const CHANNEL_NODE_HEIGHT = 54;
const CHANNEL_NODE_WIDTH = 144;
const FUTURE_WORKER_NODE_HEIGHT = 108;
const FUTURE_WORKER_NODE_WIDTH = 214;
const FUTURE_NODE_HEIGHT = 72;
const FUTURE_NODE_WIDTH = 84;
const TALL_NODE_HEIGHT = 154;
const CALLER_NODE_WIDTH = 214;
const COORDINATOR_NODE_WIDTH = 154;
const NODE_LABEL_HORIZONTAL_PADDING = 42;
const NODE_LABEL_AVERAGE_GLYPH_WIDTH = 11.5;
const HALF_DIVISOR = 2;
const FIRST_WORKER_INDEX = 0;
const NO_FUTURE_NODE_COUNT = 0;
const NO_COORDINATOR_NODE_COUNT = 0;
const NO_SCOPE_NODE_COUNT = 0;
const SINGLE_WORKER_COUNT = 1;
const PAIRED_WORKER_COUNT = 2;

const defaultLayout = {
  columns: [CALLER_COLUMN_X, COORDINATOR_COLUMN_X, WORKER_COLUMN_X, FUTURE_WORKER_COLUMN_X],
  lanes: [TOP_LANE_Y, CENTER_LANE_Y, BOTTOM_LANE_Y],
  markerId: "explorer-flow-arrow",
} as const;

const nodeSize = {
  caller: { height: TALL_NODE_HEIGHT, width: CALLER_NODE_WIDTH },
  channel: { height: CHANNEL_NODE_HEIGHT, width: CHANNEL_NODE_WIDTH },
  coordinator: { height: TALL_NODE_HEIGHT, width: COORDINATOR_NODE_WIDTH },
  future: { height: FUTURE_NODE_HEIGHT, width: FUTURE_NODE_WIDTH },
  scope: { height: 0, width: 0 },
  worker: { height: WORKER_NODE_HEIGHT, width: WORKER_NODE_WIDTH },
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
  const processLaneCount = Math.max(coordinatorNodes.length, workerNodes.length);
  const resolvedCenterLane = readCenterLane(processLaneCount);
  const hasFutureNode = futureNodes.length > NO_FUTURE_NODE_COUNT;
  const hasCoordinatorNode = coordinatorNodes.length > NO_COORDINATOR_NODE_COUNT;
  const hasScopeNode = scopeNodes.length > NO_SCOPE_NODE_COUNT;

  return [
    ...callerNodes.map((node) => createFlowNode(node, resolvedCenterLane, CALLER_COLUMN)),
    ...channelNodes.map((node) => createAuxiliaryChannelNode(node, { hasScopeNode })),
    ...futureNodes.map((node) => createAuxiliaryFutureNode(node, { hasScopeNode })),
    ...workerNodes.map((node, index) =>
      createFlowNode(
        node,
        readWorkerLane(index, processLaneCount),
        readWorkerColumn({ hasCoordinatorNode, hasFutureNode, hasScopeNode }),
        { size: readWorkerNodeSize({ hasCoordinatorNode, hasFutureNode, hasScopeNode }) },
      ),
    ),
    ...coordinatorNodes.map((node, index) =>
      createFlowNode(node, readWorkerLane(index, processLaneCount), COORDINATOR_COLUMN, {
        size: readCoordinatorNodeSize(coordinatorNodes.length),
      }),
    ),
  ];
}

function createAuxiliaryChannelNode<TEvent extends ExplorerEventId>(
  node: FlowNodeSpec<TEvent>,
  options: { readonly hasScopeNode: boolean },
): FlowNode<TEvent> {
  if (options.hasScopeNode) {
    return createPositionedFlowNode(node, SCOPED_CHANNEL_X, SCOPED_CHANNEL_LANE_Y, {
      objectEnterFrom: "top",
    });
  }

  return createPositionedFlowNode(node, CHANNEL_X, AUXILIARY_LANE_Y, { objectEnterFrom: "left" });
}

function createAuxiliaryFutureNode<TEvent extends ExplorerEventId>(
  node: FlowNodeSpec<TEvent>,
  options: { readonly hasScopeNode: boolean },
): FlowNode<TEvent> {
  if (options.hasScopeNode) {
    return createPositionedFlowNode(node, SCOPED_FUTURE_X, SCOPED_FUTURE_LANE_Y, {
      objectEnterFrom: "top",
    });
  }

  return createPositionedFlowNode(node, FUTURE_X, futureLaneY, { objectEnterFrom: "left" });
}

function createFlowNode<TEvent extends ExplorerEventId>(
  node: FlowNodeSpec<TEvent>,
  lane: number,
  column: number,
  options?: FlowNodeLayoutOptions,
): FlowNode<TEvent> {
  const left = defaultLayout.columns[column]!;
  const top = defaultLayout.lanes[lane]!;

  return createPositionedFlowNode(node, left, top, options);
}

function createPositionedFlowNode<TEvent extends ExplorerEventId>(
  node: FlowNodeSpec<TEvent>,
  left: number,
  top: number,
  options: FlowNodeLayoutOptions = {},
): FlowNode<TEvent> {
  const minimumSize = options.size ?? nodeSize[node.kind];
  const labelWidth = Math.ceil(
    node.label.length * NODE_LABEL_AVERAGE_GLYPH_WIDTH + NODE_LABEL_HORIZONTAL_PADDING,
  );
  const size = { height: minimumSize.height, width: Math.max(minimumSize.width, labelWidth) };
  const centerY = top + size.height / HALF_DIVISOR;

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
  if (workerCount <= SINGLE_WORKER_COUNT) {
    return CENTER_LANE_INDEX;
  }

  if (workerCount > defaultLayout.lanes.length) {
    throw new Error("Too many explorer flow workers.");
  }

  return Math.floor(workerCount / HALF_DIVISOR);
}

function readWorkerLane(index: number, workerCount: number): number {
  if (workerCount <= SINGLE_WORKER_COUNT) {
    return CENTER_LANE_INDEX;
  }

  if (workerCount === PAIRED_WORKER_COUNT) {
    return index === FIRST_WORKER_INDEX ? TOP_LANE_INDEX : BOTTOM_LANE_INDEX;
  }

  return index;
}

function readWorkerColumn(options: WorkerColumnOptions): number {
  if (options.hasCoordinatorNode) {
    return WORKER_COLUMN;
  }

  if (options.hasFutureNode) {
    if (options.hasScopeNode) {
      return COORDINATOR_COLUMN;
    }

    return FUTURE_WORKER_COLUMN;
  }

  return COORDINATOR_COLUMN;
}

function readWorkerNodeSize(options: WorkerColumnOptions): FlowNodeSize {
  if (options.hasFutureNode && !options.hasCoordinatorNode && !options.hasScopeNode) {
    return {
      height: FUTURE_WORKER_NODE_HEIGHT,
      width: FUTURE_WORKER_NODE_WIDTH,
    };
  }

  return nodeSize.worker;
}

function readCoordinatorNodeSize(coordinatorCount: number): FlowNodeSize {
  return coordinatorCount > SINGLE_WORKER_COUNT
    ? { height: WORKER_NODE_HEIGHT, width: COORDINATOR_NODE_WIDTH }
    : nodeSize.coordinator;
}

interface WorkerColumnOptions {
  readonly hasCoordinatorNode: boolean;
  readonly hasFutureNode: boolean;
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
