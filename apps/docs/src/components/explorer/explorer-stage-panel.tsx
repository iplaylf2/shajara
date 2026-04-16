import { HostConcurrencyDemo } from "./host-concurrency-demo";
import type { JSX } from "solid-js";
import styles from "./explorer.module.css";

export function ExplorerStagePanel(props: Props): JSX.Element {
  return (
    <section aria-labelledby="explorer-stage-title" class={styles["stagePanel"]}>
      <h2 class={styles["srOnly"]} id="explorer-stage-title">
        {props.title}
      </h2>

      <div class={styles["sceneHeader"]}>
        <p class={styles["sceneBody"]}>{props.description}</p>
      </div>

      <ExplorerStageContent stage={props.stage}>{props.children}</ExplorerStageContent>

      <div class={styles["guideList"]}>
        {props.guideRows.map((row) => (
          <div class={styles["guideRow"]}>
            <span class={styles["guideMarker"]} />
            <div class={styles["guideTrack"]}>
              <span class={styles["guideText"]}>{row}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ExplorerStageContent(props: ExplorerStageContentProps): JSX.Element {
  switch (props.stage.kind) {
    case "host-concurrency":
      return (
        <HostConcurrencyDemo codeBlockId={props.stage.codeBlockId}>
          {props.children}
        </HostConcurrencyDemo>
      );
  }
}

interface Props {
  children?: JSX.Element;
  description: string;
  guideRows: readonly string[];
  stage: StageContent;
  title: string;
}

interface ExplorerStageContentProps {
  children?: JSX.Element;
  stage: StageContent;
}

type StageContent = HostConcurrencyStage;

interface HostConcurrencyStage {
  codeBlockId: string;
  kind: "host-concurrency";
}
