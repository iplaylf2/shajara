import type { JSX } from "solid-js";
import styles from "./explorer.module.css";

export function ExplorerTopbar(props: Props): JSX.Element {
  return (
    <div class={styles["topbar"]}>
      <div class={styles["topbarTrail"]}>
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

      <details class={styles["localeMenu"]}>
        <summary aria-label={props.currentLocaleLabel} class={styles["localeSummary"]}>
          <span class={styles["localeSummaryValue"]}>{props.currentLocaleLabel}</span>
          <span aria-hidden="true" class={styles["localeSummaryCaret"]}>
            ▾
          </span>
        </summary>

        <div class={styles["localeMenuList"]}>
          {props.localeLinks.map((localeLink) => (
            <a
              class={styles["localeLink"]}
              href={localeLink.href}
              hreflang={localeLink.hreflang}
              lang={localeLink.hreflang}
            >
              {localeLink.label}
            </a>
          ))}
        </div>
      </details>
    </div>
  );
}

interface ExplorerTopbarLocaleLink {
  href: string;
  hreflang: string;
  label: string;
}

interface Props {
  brandHref: string;
  brandLabel: string;
  currentLocaleLabel: string;
  explorerLabel: string;
  localeLinks: ExplorerTopbarLocaleLink[];
  title: string;
}
