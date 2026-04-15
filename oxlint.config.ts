// oxlint-disable no-magic-numbers
import { defineConfig } from "oxlint";
import packageJson from "./package.json" with { type: "json" };
import shared from "@shajara/presets/oxlint.shared.ts";

const ignorePatterns = packageJson.workspaces.map(toIgnorePattern);

export default defineConfig({
  extends: [shared],
  // Root lint covers only non-workspace files; workspace directories use their own configs.
  ignorePatterns,
});

function toIgnorePattern(workspace: string) {
  if (workspace.endsWith("/*")) {
    return `${workspace.slice(0, -1)}**`;
  }

  if (workspace.endsWith("*")) {
    return `${workspace.slice(0, -1)}**`;
  }

  return `${workspace}/**`;
}
