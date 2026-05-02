import { readFutureNodePresence, readFutureNodeStatus } from "./flow-status";
import type { ExplorerReplayState } from "#/domain/explorer/contract";
import type { FutureFlowNode } from "./flow-model";
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
        height={FUTURE_SLOT_HEIGHT}
        rx={FUTURE_SLOT_RADIUS}
        width={FUTURE_SLOT_WIDTH}
        x={String(slot.left)}
        y={String(slot.top)}
      />
      <rect
        class={styles["flowFutureFill"]}
        height={FUTURE_FILL_HEIGHT}
        rx={FUTURE_FILL_RADIUS}
        width={FUTURE_FILL_WIDTH}
        x={String(slot.left + FUTURE_FILL_INSET_X)}
        y={String(props.target.centerY - FUTURE_FILL_HEIGHT / HALF)}
      />
    </>
  );
}

function FutureLabel(props: { label: string; target: FutureTargetGeometry }): JSX.Element {
  return (
    <text
      class={styles["flowFutureText"]}
      x={String(props.target.centerX)}
      y={String(props.target.centerY - FUTURE_LABEL_OFFSET_Y)}
    >
      {props.label}
    </text>
  );
}

function readFutureSlot(target: FutureTargetGeometry): FutureSlotGeometry {
  return {
    left: target.centerX - FUTURE_SLOT_WIDTH / HALF,
    top: target.centerY - FUTURE_SLOT_HEIGHT / HALF,
  };
}

function readFutureTarget<TEvent extends string>(
  node: FutureFlowNode<TEvent>,
): FutureTargetGeometry {
  return {
    centerX: node.left + node.width / HALF,
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

const HALF = 2;
const FUTURE_LABEL_OFFSET_Y = 26;
const FUTURE_FILL_HEIGHT = 8;
const FUTURE_FILL_INSET_X = 8;
const FUTURE_FILL_RADIUS = 4;
const FUTURE_FILL_WIDTH = 48;
const FUTURE_SLOT_HEIGHT = 18;
const FUTURE_SLOT_RADIUS = 9;
const FUTURE_SLOT_WIDTH = 64;
