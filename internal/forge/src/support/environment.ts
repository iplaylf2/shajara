import { execFileSync } from "node:child_process";
import path from "node:path";

export function resolveWorkspaceRoot(): string {
  const modulesRoot = execFileSync("pnpm", ["root", "--workspace-root"], {
    encoding: "utf8",
  }).trim();

  return path.dirname(modulesRoot);
}
