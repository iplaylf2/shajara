import type { JSX } from "solid-js";
import styles from "./explorer.module.css";

export function ExplorerCodePanel(props: Props): JSX.Element {
  return (
    <section class={styles["codePanel"]}>
      <div class={styles["placeholderIntro"]}>
        <p class={styles["placeholderBody"]}>{props.placeholder}</p>
      </div>

      <div class={styles["codeSkeleton"]}>
        {CODE_SKELETON_LINES.map((lineClass) => (
          <span class={`${styles["codeSkeletonLine"]} ${lineClass}`} />
        ))}
      </div>
    </section>
  );
}

const CODE_SKELETON_LINES = [
  styles["codeSkeletonWide"],
  styles["codeSkeletonMedium"],
  styles["codeSkeletonWide"],
  styles["codeSkeletonNarrow"],
  styles["codeSkeletonMedium"],
  styles["codeSkeletonWide"],
  styles["codeSkeletonShort"],
] as const;

interface Props {
  placeholder: string;
}
