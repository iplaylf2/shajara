import { isSettledDataLink, readLinkMode } from "./explorer-flow-state";
import type { ExplorerFlowScene } from "./explorer-flow-scene";
import type { ExplorerReplayState } from "#/domain/explorer/contract";
import type { JSX } from "solid-js";
import { createMemo } from "solid-js";
import styles from "./explorer.module.css";

export function ChannelDataLink<TEvent extends string>(props: {
  blockedAnchor: ChannelDataBlockedAnchor;
  link: ExplorerFlowScene<TEvent>["links"][number];
  state: ExplorerReplayState<TEvent>;
}): JSX.Element {
  const mode = createMemo(() => readLinkMode(props.link.activeEvents, props.state));
  const isSettled = createMemo(() => isSettledDataLink(props.link, props.state));

  return (
    <g
      classList={{
        [styles["flowChannelDataGroup"]!]: true,
        [styles["flowChannelDataGroupBlocked"]!]: mode() === "blocked",
        [styles["flowChannelDataGroupRunning"]!]: mode() === "running",
        [styles["flowChannelDataGroupSettled"]!]: isSettled(),
      }}
    >
      <path class={styles["flowChannelDataTrack"]} d={props.link.path} />
      {mode() === "running" && <ChannelDataToken path={props.link.path} />}
      {mode() === "blocked" && (
        <ChannelBlockedToken anchor={props.blockedAnchor} path={props.link.path} />
      )}
      <title>{props.link.label}</title>
    </g>
  );
}

function ChannelDataToken(props: { path: string }): JSX.Element {
  return (
    <path class={styles["flowChannelDataToken"]} d="M-5 -5 L2 0 L-5 5">
      <animateMotion dur="720ms" path={props.path} repeatCount="indefinite" rotate="auto" />
    </path>
  );
}

function ChannelBlockedToken(props: {
  anchor: ChannelDataBlockedAnchor;
  path: string;
}): JSX.Element {
  const motion = readBlockedTokenMotion(props.anchor);

  return (
    <path class={styles["flowChannelDataTokenBlocked"]} d="M-5 -5 L2 0 L-5 5">
      <animateMotion
        dur="860ms"
        keyPoints={motion.keyPoints}
        keyTimes="0;0.55;1"
        path={props.path}
        repeatCount="indefinite"
        rotate="auto"
      />
    </path>
  );
}

function readBlockedTokenMotion(anchor: ChannelDataBlockedAnchor): {
  keyPoints: string;
} {
  if (anchor === "end") {
    return { keyPoints: "0.9;1;0.9" };
  }

  return { keyPoints: "0;0.1;0" };
}

export type ChannelDataBlockedAnchor = "end" | "start";
