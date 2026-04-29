export interface CodeScroller {
  scrollToTop: (container: HTMLElement) => void;
  scrollToLine: (line: HTMLElement) => void;
}

export function createCodeScroller(isEnabled: () => boolean): CodeScroller {
  let lastLine: HTMLElement | null = null;
  let scrollFrame = emptyLength;

  return {
    scrollToLine(line) {
      if (!isEnabled()) {
        lastLine = null;
        return;
      }

      if (line === lastLine) {
        return;
      }

      lastLine = line;
      scheduleScroll(() => scrollCodeLineIntoView(line));
    },
    scrollToTop(container) {
      if (!isEnabled()) {
        lastLine = null;
        return;
      }

      lastLine = null;
      scheduleScroll(() => {
        container.scrollTo({
          behavior: prefersReducedMotion() ? "auto" : "smooth",
          top: emptyLength,
        });
      });
    },
  };

  function scheduleScroll(scroll: () => void): void {
    if (scrollFrame !== emptyLength) {
      globalThis.cancelAnimationFrame(scrollFrame);
    }

    scrollFrame = globalThis.requestAnimationFrame(() => {
      scrollFrame = emptyLength;
      scroll();
    });
  }
}

function scrollCodeLineIntoView(line: HTMLElement): void {
  const container = line.closest<HTMLElement>("[data-explorer-code]");

  if (!container) {
    throw new Error("Explorer code line is not inside an explorer code block.");
  }

  const containerRect = container.getBoundingClientRect();
  const lineRect = line.getBoundingClientRect();
  const comfortZone = container.clientHeight * codeScrollComfortRatio;
  const isComfortablyVisible =
    lineRect.top >= containerRect.top + comfortZone &&
    lineRect.bottom <= containerRect.bottom - comfortZone;

  if (isComfortablyVisible) {
    return;
  }

  const targetTop =
    container.scrollTop +
    lineRect.top -
    containerRect.top -
    container.clientHeight * codeScrollTargetRatio +
    lineRect.height / half;

  container.scrollTo({
    behavior: prefersReducedMotion() ? "auto" : "smooth",
    top: Math.max(emptyLength, targetTop),
  });
}

function prefersReducedMotion(): boolean {
  return globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

const emptyLength = 0;
const codeScrollComfortRatio = 0.18;
const codeScrollTargetRatio = 0.42;
const half = 2;
