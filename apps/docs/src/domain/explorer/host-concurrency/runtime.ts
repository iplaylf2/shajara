import { createScope, sleep } from "@shajara/host";
import { spawn, wait } from "@shajara/host/primitives";
import type { HostConcurrencyEvent } from "./trace";

const HEADER_DELAY_MS = 660;
const HOST_STEP_DELAY_MS = 180;
const SIDEBAR_DELAY_MS = 960;

export interface HostConcurrencyReplay {
  cancel: () => Promise<void>;
  run: (mark: (event: HostConcurrencyEvent) => void) => Promise<HostConcurrencyResult>;
}

export interface HostConcurrencyResult {
  header: string;
  sidebar: string;
}

export function createHostConcurrencyReplay(): HostConcurrencyReplay {
  const scope = createScope();

  return {
    cancel: () => scope.cancel(),
    run: (mark) =>
      scope.run(function* loadPage() {
        return yield* loadPageRitual(mark);
      }),
  };
}

function* loadPageRitual(mark: (event: HostConcurrencyEvent) => void) {
  mark("routine");
  yield* sleep(HOST_STEP_DELAY_MS);

  mark("spawn-header");
  const header = yield* spawn(function* loadHeader() {
    mark("header-start");
    yield* sleep(HEADER_DELAY_MS);
    mark("header-done");
    return "header";
  });

  mark("spawn-sidebar");
  const sidebar = yield* spawn(function* loadSidebar() {
    mark("sidebar-start");
    yield* sleep(SIDEBAR_DELAY_MS);
    mark("sidebar-done");
    return "sidebar";
  });

  mark("wait");
  yield* sleep(HOST_STEP_DELAY_MS);
  mark("wait-header");
  const headerValue = yield* wait(header);
  mark("wait-sidebar");
  const sidebarValue = yield* wait(sidebar);
  mark("done");

  return { header: headerValue, sidebar: sidebarValue };
}
