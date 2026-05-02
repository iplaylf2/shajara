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
  const left = Math.min(...ownedNodes.map((ownedNode) => ownedNode.left)) - scopePaddingX;
  const top = Math.min(...ownedNodes.map((ownedNode) => ownedNode.top)) - scopePaddingY;
  const right =
    Math.max(...ownedNodes.map((ownedNode) => ownedNode.left + ownedNode.width)) + scopePaddingX;
  const bottom =
    Math.max(...ownedNodes.map((ownedNode) => ownedNode.top + ownedNode.height)) + scopePaddingY;

  return {
    activeEvents: node.activeEvents,
    centerY: top + (bottom - top) / halfDivisor,
    closedEvents: node.closedEvents,
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

const halfDivisor = 2;
const scopePaddingX = 28;
const scopePaddingY = 34;
