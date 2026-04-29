import { Show, createMemo } from "solid-js";
import type { ExplorerReplayState } from "#/domain/explorer/contract";
import type { FlowScene } from "./flow-model";
import type { JSX } from "solid-js";
import { readScopeGroupStatus } from "./flow-status";
import styles from "./styles.module.css";

export function ScopeGroups<TEvent extends string>(props: {
  scene: FlowScene<TEvent>;
  state: ExplorerReplayState<TEvent>;
}): JSX.Element {
  return (
    <>
      {props.scene.groups.map((group) => (
        <ScopeGroup group={group} state={props.state} />
      ))}
    </>
  );
}

function ScopeGroup<TEvent extends string>(props: {
  group: FlowScene<TEvent>["groups"][number];
  state: ExplorerReplayState<TEvent>;
}): JSX.Element {
  const status = createMemo(() => readScopeGroupStatus(props.group, props.state));

  return (
    <Show when={status()}>
      <g
        classList={{
          [styles["flowScopeGroup"]!]: true,
          [styles["flowScopeGroupClosed"]!]: status() === "closed",
          [styles["flowScopeGroupRunning"]!]: status() === "running",
        }}
      >
        <rect
          class={styles["flowScopeBox"]}
          height={props.group.height}
          rx="8"
          width={props.group.width}
          x={props.group.left}
          y={props.group.top}
        />
        <text
          class={styles["flowScopeLabel"]}
          x={String(props.group.left + scopeLabelOffsetX)}
          y={String(props.group.top + scopeLabelOffsetY)}
        >
          {props.group.label}
        </text>
        <text
          class={styles["flowScopeStatus"]}
          x={String(props.group.left + props.group.width - scopeStatusOffsetX)}
          y={String(props.group.top + scopeLabelOffsetY)}
        >
          {status()}
        </text>
      </g>
    </Show>
  );
}

const scopeLabelOffsetX = 12;
const scopeLabelOffsetY = 15;
const scopeStatusOffsetX = 12;
