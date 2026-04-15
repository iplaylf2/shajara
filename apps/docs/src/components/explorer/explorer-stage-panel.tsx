import type { JSX } from "solid-js";
import styles from "./explorer.module.css";

const STAGE_GUIDE_ROW_COUNT = 3;

interface Props {
  description: string;
  placeholder: string;
  title: string;
}

export default function ExplorerStagePanel(props: Props): JSX.Element {
  return (
    <section aria-labelledby="explorer-stage-title" class={styles["stagePanel"]}>
      <h2 class={styles["srOnly"]} id="explorer-stage-title">
        {props.title}
      </h2>

      <div class={styles["sceneHeader"]}>
        <p class={styles["sceneBody"]}>{props.description}</p>
      </div>

      <div class={styles["placeholderIntro"]}>
        <p class={styles["placeholderBody"]}>{props.placeholder}</p>
      </div>

      <div class={styles["stageCanvas"]}>
        <div class={styles["stageCanvasFrame"]} />
        <div class={styles["stageCanvasFooter"]} />
      </div>

      <div class={styles["guideList"]}>
        {Array.from({ length: STAGE_GUIDE_ROW_COUNT }).map(() => (
          <div class={styles["guideRow"]}>
            <span class={styles["guideMarker"]} />
            <div class={styles["guideTrack"]}>
              <span class={styles["guideLine"]} />
              <span class={styles["guideLineShort"]} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
