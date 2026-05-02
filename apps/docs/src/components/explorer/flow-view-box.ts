import type { ExplorerEventId } from "#/domain/explorer/contract";
import type { FlowNodeBase } from "./flow-model";

export function readFlowViewBox<TEvent extends ExplorerEventId>(
  nodes: readonly FlowNodeBase<TEvent>[],
): string {
  const maxNodeRight = Math.max(...nodes.map((node) => node.left + node.width));
  const maxNodeBottom = Math.max(...nodes.map((node) => node.top + node.height));
  const width = Math.max(VIEW_BOX_WIDTH, maxNodeRight - VIEW_BOX_MIN_X + VIEW_BOX_PADDING_RIGHT);
  const height = Math.max(
    VIEW_BOX_HEIGHT,
    maxNodeBottom - VIEW_BOX_MIN_Y + VIEW_BOX_PADDING_BOTTOM,
  );

  return `${VIEW_BOX_MIN_X} ${VIEW_BOX_MIN_Y} ${width} ${height}`;
}

const VIEW_BOX_HEIGHT = 248;
const VIEW_BOX_MIN_X = 24;
const VIEW_BOX_MIN_Y = 24;
const VIEW_BOX_PADDING_BOTTOM = 24;
const VIEW_BOX_PADDING_RIGHT = 24;
const VIEW_BOX_WIDTH = 650;
