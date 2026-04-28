import { readChannelMeterLabel, readChannelNodeStatus } from "./explorer-flow-state";
import type { ExplorerReplayState } from "#/domain/explorer/contract";
import type { FlowNode } from "./explorer-flow-model";
import type { JSX } from "solid-js";
import { createMemo } from "solid-js";
import styles from "./explorer.module.css";

export function ChannelNode<TEvent extends string>(props: {
  node: FlowNode<TEvent>;
  state: ExplorerReplayState<TEvent>;
}): JSX.Element {
  const status = createMemo(() => readChannelNodeStatus(props.node, props.state));
  const meterLabel = createMemo(() => readChannelMeterLabel(props.node, props.state));
  const centerX = props.node.left + props.node.width / half;

  return (
    <g
      classList={{
        [styles["flowNodeChannel"]!]: true,
        [styles["flowNodeChannelDone"]!]: status() === "done",
        [styles["flowNodeChannelOpen"]!]: status() === "open",
        [styles["flowNodeChannelOverload"]!]: status() === "overload",
        [styles["flowNodeChannelPending"]!]: status() === "pending",
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
        y={String(props.node.centerY - channelMeterStackOffsetY)}
      >
        {props.node.label}
      </text>
      {props.meterLabel && (
        <text
          class={styles["flowChannelMeter"]}
          x={String(props.centerX)}
          y={String(props.node.centerY + channelMeterStackOffsetY)}
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

  return [
    `M${left} ${top}`,
    `L${right - channelPointInset} ${top}`,
    `L${right} ${centerY}`,
    `L${right - channelPointInset} ${bottom}`,
    `L${left} ${bottom}`,
    `L${left + channelConcaveInset} ${centerY}`,
    "Z",
  ].join(" ");
}

const half = 2;
const channelMeterStackOffsetY = 10;
const channelConcaveInset = 24;
const channelPointInset = 20;
