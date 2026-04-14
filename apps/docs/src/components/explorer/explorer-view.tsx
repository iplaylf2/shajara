import { For } from "solid-js";
import type { JSX } from "solid-js";

import styles from "./explorer-view.module.css";

interface Area {
  description: string;
  title: string;
}

interface Props {
  areas: Area[];
  note: string;
  noteLabel: string;
}

export default function ExplorerView({ areas, note, noteLabel }: Props): JSX.Element {
  return (
    <div class={styles["root"]}>
      <section aria-labelledby="explorer-note-title" class={styles["note"]}>
        <p class={styles["noteLabel"]} id="explorer-note-title">
          {noteLabel}
        </p>
        <p class={styles["noteBody"]}>{note}</p>
      </section>

      <ol class={styles["areaList"]}>
        <For each={areas}>
          {({ description, title }) => (
            <li class={styles["areaItem"]}>
              <strong class={styles["areaTitle"]}>{title}</strong>
              <p class={styles["areaDescription"]}>{description}</p>
            </li>
          )}
        </For>
      </ol>
    </div>
  );
}
