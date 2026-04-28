import type { ExplorerFlowNode } from "./explorer-flow-scene";
import type { ExplorerReplayState } from "#/domain/explorer/contract";
import type { JSX } from "solid-js";
import { createMemo } from "solid-js";
import { readChannelNodeStatus } from "./explorer-flow-state";
import styles from "./explorer.module.css";

export function ChannelNode<TEvent extends string>(props: {
  node: ExplorerFlowNode<TEvent>;
  state: ExplorerReplayState<TEvent>;
}): JSX.Element {
  const status = createMemo(() => readChannelNodeStatus(props.node, props.state));
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
      <rect
        class={styles["flowChannelBody"]}
        height={props.node.height}
        rx="22"
        width={props.node.width}
        x={props.node.left}
        y={props.node.top}
      />
      <ChannelPorts node={props.node} />
      <ChannelLabel centerX={centerX} node={props.node} />
    </g>
  );
}

function ChannelPorts<TEvent extends string>(props: {
  node: ExplorerFlowNode<TEvent>;
}): JSX.Element {
  const right = props.node.left + props.node.width;

  return (
    <>
      <circle
        class={styles["flowChannelPort"]}
        cx={String(props.node.left)}
        cy={String(props.node.centerY)}
        r={String(channelPortRadius)}
      />
      <circle
        class={styles["flowChannelPort"]}
        cx={String(right)}
        cy={String(props.node.centerY)}
        r={String(channelPortRadius)}
      />
    </>
  );
}

function ChannelLabel<TEvent extends string>(props: {
  centerX: number;
  node: ExplorerFlowNode<TEvent>;
}): JSX.Element {
  const labelY = createMemo(() =>
    props.node.caption ? props.node.centerY - channelCaptionStackOffsetY : props.node.centerY,
  );

  return (
    <>
      <text class={styles["flowChannelText"]} x={String(props.centerX)} y={String(labelY())}>
        {props.node.label}
      </text>
      {props.node.caption && (
        <text
          class={styles["flowChannelCaption"]}
          x={String(props.centerX)}
          y={String(props.node.centerY + channelCaptionStackOffsetY)}
        >
          {props.node.caption}
        </text>
      )}
    </>
  );
}

const half = 2;
const channelPortRadius = 5;
const channelCaptionStackOffsetY = 10;
