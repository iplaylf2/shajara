import type { ExplorerExample } from "./explorer-content";
import type { JSX } from "solid-js";
import styles from "./explorer.module.css";

interface Props {
  currentExampleId: string;
  examples: ExplorerExample[];
}

export default function ExplorerExampleRail(props: Props): JSX.Element {
  return (
    <aside class={styles["rail"]}>
      <div class={styles["tabList"]}>
        {props.examples.map((example) => (
          <a
            {...(example.id === props.currentExampleId ? { "aria-current": "page" } : {})}
            class={`${styles["tabButton"]}${example.id === props.currentExampleId ? ` ${styles["tabButtonSelected"]}` : ""}`}
            href={example.href}
          >
            {example.title}
          </a>
        ))}
      </div>
    </aside>
  );
}
