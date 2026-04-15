import type { JSX } from "solid-js";
import styles from "./explorer.module.css";

export function ExplorerExampleRail(props: Props): JSX.Element {
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

interface ExplorerExampleRailItem {
  href: string;
  id: string;
  title: string;
}

interface Props {
  currentExampleId: string;
  examples: ExplorerExampleRailItem[];
}
