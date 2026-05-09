import type { ExplorerEventId, ExplorerFlowNode as FlowNodeSpec } from "#/domain/explorer/contract";
import type { FlowNode, FlowScene } from "./flow-model";

export function resolveScopeGroups<TEvent extends ExplorerEventId>(
  graphNodes: readonly FlowNodeSpec<TEvent>[],
  nodePositions: ReadonlyMap<string, FlowNode<TEvent>>,
): FlowScene<TEvent>["groups"] {
  return graphNodes
    .filter((node) => node.kind === "scope")
    .map((node) => createScopeGroup(node, nodePositions));
}

function createScopeGroup<TEvent extends ExplorerEventId>(
  node: Extract<FlowNodeSpec<TEvent>, { readonly kind: "scope" }>,
  nodePositions: ReadonlyMap<string, FlowNode<TEvent>>,
): FlowScene<TEvent>["groups"][number] {
  const ownedNodes = node.ownedNodeIds.map((nodeId) => readNode(nodePositions, nodeId));
  const left = Math.min(...ownedNodes.map((ownedNode) => ownedNode.left)) - SCOPE_PADDING_X;
  const top = Math.min(...ownedNodes.map((ownedNode) => ownedNode.top)) - SCOPE_PADDING_Y;
  const right =
    Math.max(...ownedNodes.map((ownedNode) => ownedNode.left + ownedNode.width)) + SCOPE_PADDING_X;
  const bottom =
    Math.max(...ownedNodes.map((ownedNode) => ownedNode.top + ownedNode.height)) + SCOPE_PADDING_Y;

  return {
    activeEvents: node.activeEvents,
    centerY: top + (bottom - top) / HALF_DIVISOR,
    closedEvents: node.closedEvents,
    closingEvents: node.closingEvents,
    completedEvents: node.completedEvents,
    height: bottom - top,
    id: node.id,
    label: node.label,
    left,
    ownedNodeIds: node.ownedNodeIds,
    statusTargetIds: node.statusTargetIds,
    top,
    variant: node.kind,
    width: right - left,
  };
}

function readNode<TEvent extends ExplorerEventId>(
  nodePositions: ReadonlyMap<string, FlowNode<TEvent>>,
  nodeId: string,
): FlowNode<TEvent> {
  const node = nodePositions.get(nodeId);

  if (!node) {
    throw new Error(`Unknown scope-owned flow node: ${nodeId}`);
  }

  return node;
}

const HALF_DIVISOR = 2;
const SCOPE_PADDING_X = 28;
const SCOPE_PADDING_Y = 34;
