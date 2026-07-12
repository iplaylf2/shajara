import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import site from "./site/meta.json" with { type: "json" };

const workspaceRoot = path.dirname(
  execFileSync("pnpm", ["root", "--workspace-root"], { encoding: "utf8" }).trim(),
);
const faviconPath = fileURLToPath(import.meta.resolve("@shajara/brand/favicon.svg"));

const config = {
  alwaysCreateEntryPointModule: true,
  entryPointStrategy: "packages",
  // Revisit TypeDoc support to avoid internal path coupling.
  entryPoints: [`${workspaceRoot}/packages/host`, `${workspaceRoot}/packages/kernel`],
  favicon: faviconPath,
  githubPages: false,
  name: "shajara API Map",
  navigationLinks: {
    Docs: site.basePath,
  },
  out: "public/api-map",
  readme: "none",
};

export default config;
