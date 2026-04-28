import type { ExplorerEventId, ExplorerFlowGraphLink } from "#/domain/explorer/contract";
import type { ExplorerFlowNode, FlowLinkDirection } from "./explorer-flow-scene";

export function resolveFlowLinkPath<TEvent extends ExplorerEventId>(
  link: ExplorerFlowGraphLink<TEvent>,
  points: FlowLinkPathPoints<TEvent>,
): FlowLinkPath {
  const bottomEntry = readBottomEntryLink(link, points);
  const toX = bottomEntry?.anchorX ?? points.toX;
  const toY = bottomEntry?.anchorY ?? points.toY;

  return {
    labelX: (points.fromX + toX) / halfDivisor,
    labelY: (points.fromY + toY) / halfDivisor,
    path: bottomEntry
      ? createBottomEntryPath(points.fromX, points.fromY, toX, toY)
      : createSideEntryPath({ ...points, toX, toY }),
  };
}

function createSideEntryPath(points: FlowLinkControlPoints): string {
  return [
    `M${points.fromX} ${points.fromY}`,
    `C${points.fromX + points.direction * linkControlFromOffsetX} ${points.fromY}`,
    `${points.toX - points.direction * linkControlToOffsetX} ${points.toY}`,
    `${points.toX} ${points.toY}`,
  ].join(" ");
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
  link: ExplorerFlowGraphLink<TEvent>,
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
  from: ExplorerFlowNode<TEvent>;
  fromX: number;
  fromY: number;
  to: ExplorerFlowNode<TEvent>;
  toX: number;
  toY: number;
}

interface FlowLinkAnchor {
  anchorX: number;
  anchorY: number;
}

interface FlowLinkControlPoints {
  direction: FlowLinkDirection;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}

const bottomLinkControlOffsetY = 34;
const bottomLinkAnchorInsetX = 32;
const bottomLinkAnchorOffsetX = 54;
const bottomLinkFromControlOffsetX = 18;
const bottomLinkToControlOffsetX = 22;
const halfDivisor = 2;
const linkControlFromOffsetX = 76;
const linkControlToOffsetX = 84;
