import type { ExplorerEventId } from "#/domain/explorer/contract";
import type { FlowNodeBase } from "./flow-model";

export function readFlowViewBox<TEvent extends ExplorerEventId>(
  nodes: readonly FlowNodeBase<TEvent>[],
): string {
  const maxNodeRight = Math.max(...nodes.map((node) => node.left + node.width));
  const maxNodeBottom = Math.max(...nodes.map((node) => node.top + node.height));
  const width = Math.max(viewBoxWidth, maxNodeRight - viewBoxMinX + viewBoxPaddingRight);
  const height = Math.max(viewBoxHeight, maxNodeBottom - viewBoxMinY + viewBoxPaddingBottom);

  return `${viewBoxMinX} ${viewBoxMinY} ${width} ${height}`;
}

const viewBoxHeight = 248;
const viewBoxMinX = 24;
const viewBoxMinY = 24;
const viewBoxPaddingBottom = 24;
const viewBoxPaddingRight = 24;
const viewBoxWidth = 650;
