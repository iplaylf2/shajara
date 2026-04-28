import type { ExplorerEventId } from "#/domain/explorer/contract";
import type { FlowNode } from "./flow-model";

export function readFlowViewBox<TEvent extends ExplorerEventId>(
  nodes: readonly FlowNode<TEvent>[],
): string {
  const maxNodeRight = Math.max(...nodes.map((node) => node.left + node.width));
  const width = Math.max(viewBoxWidth, maxNodeRight - viewBoxMinX + viewBoxPaddingRight);

  return `${viewBoxMinX} ${viewBoxMinY} ${width} ${viewBoxHeight}`;
}

const viewBoxHeight = 248;
const viewBoxMinX = 24;
const viewBoxMinY = 24;
const viewBoxPaddingRight = 24;
const viewBoxWidth = 650;
