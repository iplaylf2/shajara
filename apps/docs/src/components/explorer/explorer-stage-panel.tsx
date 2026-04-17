import type { ExplorerStage } from "#/domain/explorer/stage";
import { HostConcurrencyDemo } from "./host-concurrency-demo";
import type { JSX } from "solid-js";
import { buildExplorerCodeBlockId } from "#/domain/explorer/stage";
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

      <ExplorerStageContent exampleId={props.exampleId} stage={props.stage}>
        {props.children}
      </ExplorerStageContent>

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
  const StageDemo = STAGE_DEMOS[props.stage.kind];

  return (
    <StageDemo codeBlockId={buildExplorerCodeBlockId(props.exampleId)}>{props.children}</StageDemo>
  );
}

const STAGE_DEMOS = {
  "host-concurrency": HostConcurrencyDemo,
} satisfies Record<
  ExplorerStage["kind"],
  (props: { children?: JSX.Element; codeBlockId: string }) => JSX.Element
>;

interface Props {
  children?: JSX.Element;
  description: string;
  exampleId: string;
  guideRows: readonly string[];
  stage: StageContent;
  title: string;
}

interface ExplorerStageContentProps {
  children?: JSX.Element;
  exampleId: string;
  stage: StageContent;
}

type StageContent = ExplorerStage;
