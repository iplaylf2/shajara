/// <reference types="node" />
import { defineConfig } from "oxlint";
// oxlint-disable-next-line import/no-nodejs-modules
import { execFileSync } from "node:child_process";

import shared from "@shajara/presets/oxlint.shared.ts";

export default defineConfig({
  extends: [shared],
  ignorePatterns: workspaceIgnorePatterns(),
});

function workspaceIgnorePatterns(): string[] {
  const output = execFileSync("yarn", ["workspaces", "list", "--json"], {
    encoding: "utf8",
  });

  return output
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line) as YarnWorkspace)
    .map((workspace) => workspace.location)
    .filter((location) => location !== ".")
    .map((location) => `${location}/**`);
}

interface YarnWorkspace {
  location: string;
}
