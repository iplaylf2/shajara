import type { ExplorerEventId, ExplorerFlowLink } from "#/domain/explorer/contract";
import type { FlowLinkDirection } from "./flow-scene";
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
    labelX: (fromX + toX) / halfDivisor,
    labelY: (fromY + toY) / halfDivisor,
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
  const maxOffsetX = Math.max(minSideEntryControlOffsetX, linkDistanceX / halfDivisor);

  return {
    fromX: Math.min(linkControlFromOffsetX, maxOffsetX),
    toX: Math.min(linkControlToOffsetX, maxOffsetX),
  };
}

function createBottomEntryPath(fromX: number, fromY: number, toX: number, toY: number): string {
  return [
    `M${fromX} ${fromY}`,
    `C${fromX + bottomLinkFromControlOffsetX} ${fromY - bottomLinkControlOffsetY}`,
    `${toX - bottomLinkToControlOffsetX} ${toY + bottomLinkControlOffsetY}`,
    `${toX} ${toY}`,
  ].join(" ");
}

function readBottomEntryLink<TEvent extends ExplorerEventId>(
  link: ExplorerFlowLink<TEvent>,
  points: FlowLinkPathPoints<TEvent>,
): FlowLinkAnchor | null {
  if (
    link.kind !== "data" ||
    points.from.variant !== "channel" ||
    points.to.variant === "channel"
  ) {
    return null;
  }

  return {
    anchorX: readBottomEntryX(points),
    anchorY: points.to.top + points.to.height,
    fromX: points.fromX + bottomLinkExitOffsetX,
    fromY: points.fromY,
  };
}

function readBottomEntryX<TEvent extends ExplorerEventId>(
  points: FlowLinkPathPoints<TEvent>,
): number {
  const preferredX = points.fromX + bottomLinkAnchorOffsetX;
  const minX = points.to.left + bottomLinkAnchorInsetX;
  const maxX = points.to.left + points.to.width - bottomLinkAnchorInsetX;

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

const bottomLinkControlOffsetY = 34;
const bottomLinkAnchorInsetX = 32;
const bottomLinkAnchorOffsetX = 54;
const bottomLinkExitOffsetX = 12;
const bottomLinkFromControlOffsetX = 18;
const bottomLinkToControlOffsetX = 22;
const halfDivisor = 2;
const linkControlFromOffsetX = 76;
const linkControlToOffsetX = 84;
const minSideEntryControlOffsetX = 18;
