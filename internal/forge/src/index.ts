#!/usr/bin/env node

import { enableCompileCache } from "node:module";

enableCompileCache();

const [command] = process.argv.slice(2);

switch (command) {
  case "depcruise": {
    await import("./depcruise/index.ts");
    break;
  }
  default: {
    throw new Error('Expected command "depcruise".');
  }
}
