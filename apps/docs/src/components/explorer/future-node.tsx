// oxlint-disable sort-imports
import type { ExplorerReplayState } from "#/domain/explorer/contract";
import type { FutureFlowNode } from "./flow-model";
import { readFutureNodePresence, readFutureNodeStatus } from "./flow-status";
import type { JSX } from "solid-js";
import { createMemo } from "solid-js";
import styles from "./styles.module.css";

export function FutureNode<TEvent extends string>(props: {
  node: FutureFlowNode<TEvent>;
  state: ExplorerReplayState<TEvent>;
}): JSX.Element {
  const presence = createMemo(() => readFutureNodePresence(props.node, props.state));
  const status = createMemo(() => readFutureNodeStatus(props.node, props.state));
  const target = createMemo(() => readFutureTarget(props.node));

  return (
    <g
      classList={{
        [styles["flowNodeFuture"]!]: true,
        [styles["flowNodeFutureHidden"]!]: presence() === "hidden",
        [styles["flowNodeFuturePending"]!]: status() === "pending",
        [styles["flowNodeFutureSettled"]!]: status() === "settled",
        [styles["flowNodeFutureVisible"]!]: presence() === "visible",
        [styles["flowObjectEnterFromLeft"]!]: props.node.objectEnterFrom === "left",
        [styles["flowObjectEnterFromTop"]!]: props.node.objectEnterFrom === "top",
      }}
    >
      <FutureTarget target={target()} />
      <FutureLabel label={props.node.label} target={target()} />
    </g>
  );
}

function FutureTarget(props: { target: FutureTargetGeometry }): JSX.Element {
  const slot = readFutureSlot(props.target);

  return (
    <>
      <rect
        class={styles["flowFutureSlot"]}
        height={futureSlotHeight}
        rx={futureSlotRadius}
        width={futureSlotWidth}
        x={String(slot.left)}
        y={String(slot.top)}
      />
      <rect
        class={styles["flowFutureFill"]}
        height={futureFillHeight}
        rx={futureFillRadius}
        width={futureFillWidth}
        x={String(slot.left + futureFillInsetX)}
        y={String(props.target.centerY - futureFillHeight / half)}
      />
    </>
  );
}

function FutureLabel(props: { label: string; target: FutureTargetGeometry }): JSX.Element {
  return (
    <text
      class={styles["flowFutureText"]}
      x={String(props.target.centerX)}
      y={String(props.target.centerY - futureLabelOffsetY)}
    >
      {props.label}
    </text>
  );
}

function readFutureSlot(target: FutureTargetGeometry): FutureSlotGeometry {
  return {
    left: target.centerX - futureSlotWidth / half,
    top: target.centerY - futureSlotHeight / half,
  };
}

function readFutureTarget<TEvent extends string>(
  node: FutureFlowNode<TEvent>,
): FutureTargetGeometry {
  return {
    centerX: node.left + node.width / half,
    centerY: node.centerY,
  };
}

interface FutureTargetGeometry {
  readonly centerX: number;
  readonly centerY: number;
}

interface FutureSlotGeometry {
  readonly left: number;
  readonly top: number;
}

const half = 2;
const futureLabelOffsetY = 26;
const futureFillHeight = 8;
const futureFillInsetX = 8;
const futureFillRadius = 4;
const futureFillWidth = 48;
const futureSlotHeight = 18;
const futureSlotRadius = 9;
const futureSlotWidth = 64;
