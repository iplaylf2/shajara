import type { ExplorerEventId, ExplorerFlowLink } from "#/domain/explorer/contract";
import type { FlowLinkDirection } from "./flow-link-layout";
import type { FlowNode } from "./flow-model";

export function resolveFlowLinkPath<TEvent extends ExplorerEventId>(
  link: ExplorerFlowLink<TEvent>,
  points: FlowLinkPathPoints<TEvent>,
): FlowLinkPath {
  const bottomEntry = readBottomEntryLink(link, points);
  const fromX = bottomEntry?.fromX ?? points.fromX;
  const fromY = bottomEntry?.fromY ?? points.fromY;
  const toX = bottomEntry?.anchorX ?? points.toX;
  const toY = bottomEntry?.anchorY ?? points.toY;

  return {
    labelX: (fromX + toX) / HALF_DIVISOR,
    labelY: (fromY + toY) / HALF_DIVISOR,
    path: bottomEntry
      ? createBottomEntryPath(fromX, fromY, toX, toY)
      : createSideEntryPath({ ...points, fromX, fromY, toX, toY }),
  };
}

function createSideEntryPath(points: FlowLinkControlPoints): string {
  const controlOffsets = resolveSideEntryControlOffsets(points);

  return [
    `M${points.fromX} ${points.fromY}`,
    `C${points.fromX + points.direction * controlOffsets.fromX} ${points.fromY}`,
    `${points.toX - points.direction * controlOffsets.toX} ${points.toY}`,
    `${points.toX} ${points.toY}`,
  ].join(" ");
}

function resolveSideEntryControlOffsets(points: FlowLinkControlPoints): FlowLinkControlOffsets {
  const linkDistanceX = Math.abs(points.toX - points.fromX);
  const maxOffsetX = Math.max(MIN_SIDE_ENTRY_CONTROL_OFFSET_X, linkDistanceX / HALF_DIVISOR);

  return {
    fromX: Math.min(LINK_CONTROL_FROM_OFFSET_X, maxOffsetX),
    toX: Math.min(LINK_CONTROL_TO_OFFSET_X, maxOffsetX),
  };
}

function createBottomEntryPath(fromX: number, fromY: number, toX: number, toY: number): string {
  return [
    `M${fromX} ${fromY}`,
    `C${fromX + BOTTOM_LINK_FROM_CONTROL_OFFSET_X} ${fromY - BOTTOM_LINK_CONTROL_OFFSET_Y}`,
    `${toX - BOTTOM_LINK_TO_CONTROL_OFFSET_X} ${toY + BOTTOM_LINK_CONTROL_OFFSET_Y}`,
    `${toX} ${toY}`,
  ].join(" ");
}

function readBottomEntryLink<TEvent extends ExplorerEventId>(
  link: ExplorerFlowLink<TEvent>,
  points: FlowLinkPathPoints<TEvent>,
): FlowLinkAnchor | null {
  if (!usesBottomEntry(link, points)) {
    return null;
  }

  return {
    anchorX: readBottomEntryX(points),
    anchorY: points.to.top + points.to.height,
    fromX: readBottomEntryFromX(points),
    fromY: points.fromY,
  };
}

function usesBottomEntry<TEvent extends ExplorerEventId>(
  link: ExplorerFlowLink<TEvent>,
  points: FlowLinkPathPoints<TEvent>,
): boolean {
  if (points.to.variant === "channel") {
    return false;
  }

  if (link.kind === "data" && points.from.variant === "channel") {
    return true;
  }

  return link.kind === "wait" && points.direction > NO_DIRECTION && points.from.top > points.to.top;
}

function readBottomEntryFromX<TEvent extends ExplorerEventId>(
  points: FlowLinkPathPoints<TEvent>,
): number {
  return points.from.variant === "channel"
    ? points.fromX + BOTTOM_LINK_EXIT_OFFSET_X
    : points.fromX;
}

function readBottomEntryX<TEvent extends ExplorerEventId>(
  points: FlowLinkPathPoints<TEvent>,
): number {
  const preferredX = points.fromX + BOTTOM_LINK_ANCHOR_OFFSET_X;
  const minX = points.to.left + BOTTOM_LINK_ANCHOR_INSET_X;
  const maxX = points.to.left + points.to.width - BOTTOM_LINK_ANCHOR_INSET_X;

  return Math.min(maxX, Math.max(minX, preferredX));
}

interface FlowLinkPath {
  labelX: number;
  labelY: number;
  path: string;
}

interface FlowLinkPathPoints<TEvent extends ExplorerEventId> {
  direction: FlowLinkDirection;
  from: FlowNode<TEvent>;
  fromX: number;
  fromY: number;
  to: FlowNode<TEvent>;
  toX: number;
  toY: number;
}

interface FlowLinkAnchor {
  anchorX: number;
  anchorY: number;
  fromX: number;
  fromY: number;
}

interface FlowLinkControlPoints {
  direction: FlowLinkDirection;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}

interface FlowLinkControlOffsets {
  fromX: number;
  toX: number;
}

const BOTTOM_LINK_CONTROL_OFFSET_Y = 34;
const BOTTOM_LINK_ANCHOR_INSET_X = 32;
const BOTTOM_LINK_ANCHOR_OFFSET_X = 54;
const BOTTOM_LINK_EXIT_OFFSET_X = 12;
const BOTTOM_LINK_FROM_CONTROL_OFFSET_X = 18;
const BOTTOM_LINK_TO_CONTROL_OFFSET_X = 22;
const HALF_DIVISOR = 2;
const LINK_CONTROL_FROM_OFFSET_X = 76;
const LINK_CONTROL_TO_OFFSET_X = 84;
const MIN_SIDE_ENTRY_CONTROL_OFFSET_X = 18;
const NO_DIRECTION = 0;
