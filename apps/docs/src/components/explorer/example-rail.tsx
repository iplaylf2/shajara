import type { ExplorerExampleId } from "#/domain/explorer/examples";
import type { JSX } from "solid-js";
import styles from "./styles.module.css";

export function ExplorerExampleRail(props: Props): JSX.Element {
  return (
    <aside class={styles["rail"]}>
      <div class={styles["tabList"]}>
        {props.examples.map((example) => {
          const isSelected = example.id === props.currentExampleId;

          return (
            <a
              {...(isSelected ? { "aria-current": "page" } : {})}
              class={styles["tabButton"]}
              classList={{
                [styles["tabButtonSelected"]!]: isSelected,
              }}
              href={example.href}
            >
              {example.title}
            </a>
          );
        })}
      </div>
    </aside>
  );
}

interface ExplorerExampleRailItem {
  href: string;
  id: ExplorerExampleId;
  title: string;
}

interface Props {
  currentExampleId: ExplorerExampleId;
  examples: readonly ExplorerExampleRailItem[];
}
