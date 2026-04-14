import { For, createMemo, createSignal } from "solid-js";
import type { JSX } from "solid-js";

import styles from "./explorer-view.module.css";

const FIRST_EXAMPLE_INDEX = 0;
const STAGE_GUIDE_ROW_COUNT = 3;
const CODE_SKELETON_LINES = [
  "wide",
  "medium",
  "wide",
  "narrow",
  "medium",
  "wide",
  "short",
] as const;

interface Example {
  description: string;
  id: string;
  title: string;
}

export type { Example as ExplorerExample };

interface Props {
  brandHref: string;
  brandLabel: string;
  examples: Example[];
  explorerLabel: string;
}

function joinClasses(...classNames: (string | false | null | undefined)[]): string {
  return classNames.filter(Boolean).join(" ");
}

function readInitialExampleId(examples: Example[]): string {
  return examples[FIRST_EXAMPLE_INDEX]?.id ?? "";
}

function readSelectedExample(examples: Example[], selectedExampleId: string): Example | undefined {
  return (
    examples.find((example) => example.id === selectedExampleId) ?? examples[FIRST_EXAMPLE_INDEX]
  );
}

function buildStageGuideRows(): undefined[] {
  return Array.from({ length: STAGE_GUIDE_ROW_COUNT });
}

function ExplorerTopbar(props: {
  brandHref: string;
  brandLabel: string;
  explorerLabel: string;
  title: string;
}): JSX.Element {
  return (
    <div class={styles["topbar"]}>
      <a class={styles["brandLink"]} href={props.brandHref}>
        {props.brandLabel}
      </a>
      <span aria-hidden="true" class={styles["topbarDivider"]}>
        /
      </span>
      <span class={styles["topbarSection"]}>{props.explorerLabel}</span>
      <span aria-hidden="true" class={styles["topbarDivider"]}>
        /
      </span>
      <span class={styles["topbarTitle"]}>{props.title}</span>
    </div>
  );
}

function StageGuide(): JSX.Element {
  return (
    <div class={styles["guideList"]}>
      <For each={buildStageGuideRows()}>
        {() => (
          <div class={styles["guideRow"]}>
            <span class={styles["guideMarker"]} />
            <div class={styles["guideTrack"]}>
              <span class={styles["guideLine"]} />
              <span class={styles["guideLineShort"]} />
            </div>
          </div>
        )}
      </For>
    </div>
  );
}

function CodeSkeleton(): JSX.Element {
  return (
    <div class={styles["codeSkeleton"]}>
      <For each={CODE_SKELETON_LINES}>
        {(line) => (
          <span
            class={joinClasses(
              styles["codeSkeletonLine"],
              line === "wide" && styles["codeSkeletonWide"],
              line === "medium" && styles["codeSkeletonMedium"],
              line === "narrow" && styles["codeSkeletonNarrow"],
              line === "short" && styles["codeSkeletonShort"],
            )}
          />
        )}
      </For>
    </div>
  );
}

function ExampleTab(props: {
  example: Example;
  isSelected: boolean;
  onSelect: () => void;
}): JSX.Element {
  return (
    <button
      aria-selected={props.isSelected}
      class={joinClasses(styles["tabButton"], props.isSelected && styles["tabButtonSelected"])}
      onClick={props.onSelect}
      role="tab"
      type="button"
    >
      {props.example.title}
    </button>
  );
}

function ExampleRail(props: {
  examples: Example[];
  selectedExampleId: () => string;
  setSelectedExampleId: (value: string) => string;
}): JSX.Element {
  return (
    <aside class={styles["rail"]}>
      <div class={styles["tabList"]} role="tablist">
        <For each={props.examples}>
          {(example) => (
            <ExampleTab
              example={example}
              isSelected={example.id === props.selectedExampleId()}
              onSelect={() => props.setSelectedExampleId(example.id)}
            />
          )}
        </For>
      </div>
    </aside>
  );
}

function StagePanel(props: { description: string; title: string }): JSX.Element {
  return (
    <section aria-labelledby="explorer-stage-title" class={styles["stagePanel"]}>
      <h2 class={styles["srOnly"]} id="explorer-stage-title">
        {props.title}
      </h2>

      <div class={styles["sceneHeader"]}>
        <p class={styles["sceneBody"]}>{props.description}</p>
      </div>

      <div class={styles["placeholderIntro"]}>
        <p class={styles["placeholderBody"]}>
          Animation composition is intentionally undecided here. This tray only marks where the
          runtime motion will be staged.
        </p>
      </div>

      <div class={styles["stageCanvas"]}>
        <div class={styles["stageCanvasFrame"]} />
        <div class={styles["stageCanvasFooter"]} />
      </div>

      <StageGuide />
    </section>
  );
}

function CodePanel(): JSX.Element {
  return (
    <section class={styles["codePanel"]}>
      <div class={styles["placeholderIntro"]}>
        <p class={styles["placeholderBody"]}>
          Final example code, annotation style, and supplementary notes are intentionally left open.
        </p>
      </div>

      <CodeSkeleton />
    </section>
  );
}

export default function ExplorerView(props: Props): JSX.Element {
  const initialExampleId = readInitialExampleId(props.examples);
  const [selectedExampleId, setSelectedExampleId] = createSignal(initialExampleId);

  const selectedExample = createMemo(() =>
    readSelectedExample(props.examples, selectedExampleId()),
  );

  return (
    <div class={styles["root"]}>
      <ExplorerTopbar
        brandHref={props.brandHref}
        brandLabel={props.brandLabel}
        explorerLabel={props.explorerLabel}
        title={selectedExample()?.title ?? ""}
      />

      <section class={styles["surface"]}>
        <div class={styles["contentGrid"]}>
          <StagePanel
            description={selectedExample()?.description ?? ""}
            title={selectedExample()?.title ?? ""}
          />
          <ExampleRail
            examples={props.examples}
            selectedExampleId={selectedExampleId}
            setSelectedExampleId={setSelectedExampleId}
          />
          <CodePanel />
        </div>
      </section>
    </div>
  );
}
