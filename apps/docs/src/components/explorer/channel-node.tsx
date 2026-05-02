import { readChannelMeterLabel, readChannelNodeStatus } from "./flow-status";
import type { ExplorerReplayState } from "#/domain/explorer/contract";
import type { FlowNode } from "./flow-model";
import type { JSX } from "solid-js";
import { createMemo } from "solid-js";
import styles from "./styles.module.css";

export function ChannelNode<TEvent extends string>(props: {
  node: FlowNode<TEvent>;
  state: ExplorerReplayState<TEvent>;
}): JSX.Element {
  const status = createMemo(() => readChannelNodeStatus(props.node, props.state));
  const meterLabel = createMemo(() => readChannelMeterLabel(props.node, props.state));
  const centerX = props.node.left + props.node.width / HALF;

  return (
    <g
      classList={{
        [styles["flowNodeChannel"]!]: true,
        [styles["flowNodeChannelDone"]!]: status() === "done",
        [styles["flowNodeChannelOpen"]!]: status() === "open",
        [styles["flowNodeChannelOverload"]!]: status() === "overload",
        [styles["flowNodeChannelPending"]!]: status() === "pending",
        [styles["flowObjectEnterFromLeft"]!]: props.node.objectEnterFrom === "left",
        [styles["flowObjectEnterFromTop"]!]: props.node.objectEnterFrom === "top",
      }}
    >
      <path class={styles["flowChannelBody"]} d={createChannelBodyPath(props.node)} />
      <ChannelLabel centerX={centerX} meterLabel={meterLabel()} node={props.node} />
    </g>
  );
}

function ChannelLabel<TEvent extends string>(props: {
  centerX: number;
  meterLabel: string | null;
  node: FlowNode<TEvent>;
}): JSX.Element {
  return (
    <>
      <text
        class={styles["flowChannelText"]}
        x={String(props.centerX)}
        y={String(props.node.centerY - CHANNEL_METER_STACK_OFFSET_Y)}
      >
        {props.node.label}
      </text>
      {props.meterLabel && (
        <text
          class={styles["flowChannelMeter"]}
          x={String(props.centerX)}
          y={String(props.node.centerY + CHANNEL_METER_STACK_OFFSET_Y)}
        >
          {props.meterLabel}
        </text>
      )}
    </>
  );
}

function createChannelBodyPath<TEvent extends string>(node: FlowNode<TEvent>): string {
  const { centerY, height, left, top, width } = node;
  const right = left + width;
  const bottom = top + height;

  if (node.variant === "channel" && node.channelDirection === "left") {
    return [
      `M${right} ${top}`,
      `L${left + CHANNEL_POINT_INSET} ${top}`,
      `L${left} ${centerY}`,
      `L${left + CHANNEL_POINT_INSET} ${bottom}`,
      `L${right} ${bottom}`,
      `L${right - CHANNEL_CONCAVE_INSET} ${centerY}`,
      "Z",
    ].join(" ");
  }

  return [
    `M${left} ${top}`,
    `L${right - CHANNEL_POINT_INSET} ${top}`,
    `L${right} ${centerY}`,
    `L${right - CHANNEL_POINT_INSET} ${bottom}`,
    `L${left} ${bottom}`,
    `L${left + CHANNEL_CONCAVE_INSET} ${centerY}`,
    "Z",
  ].join(" ");
}

const HALF = 2;
const CHANNEL_METER_STACK_OFFSET_Y = 10;
const CHANNEL_CONCAVE_INSET = 24;
const CHANNEL_POINT_INSET = 20;
