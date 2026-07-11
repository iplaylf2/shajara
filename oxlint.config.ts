/// <reference types="node" />
import { defineConfig } from "oxlint";
// oxlint-disable-next-line import/no-nodejs-modules
import { execFileSync } from "node:child_process";
import path from "node:path";

import shared from "@shajara/presets/oxlint.shared.ts";

export default defineConfig({
  extends: [shared],
  ignorePatterns: workspaceIgnorePatterns(),
});

function workspaceIgnorePatterns(): string[] {
  const workspaceRoot = path.dirname(
    execFileSync("pnpm", ["root", "--workspace-root"], { encoding: "utf8" }).trim(),
  );
  const output = execFileSync("pnpm", ["list", "--recursive", "--depth", "-1", "--json"], {
    cwd: workspaceRoot,
    encoding: "utf8",
  });

  return (JSON.parse(output) as PnpmWorkspace[])
    .map((workspace) => workspace.path)
    .filter((workspacePath) => workspacePath !== workspaceRoot)
    .map((workspacePath) => `${path.relative(workspaceRoot, workspacePath)}/**`);
}

interface PnpmWorkspace {
  path: string;
}
