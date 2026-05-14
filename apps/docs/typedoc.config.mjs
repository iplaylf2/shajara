import site from "./site/meta.json" with { type: "json" };

const workspaceRoot = process.env["PROJECT_CWD"];

const config = {
  alwaysCreateEntryPointModule: true,
  entryPointStrategy: "packages",
  entryPoints: [`${workspaceRoot}/packages/host`, `${workspaceRoot}/packages/kernel`],
  githubPages: false,
  name: "shajara API",
  navigationLinks: {
    Overview: site.basePath,
  },
  out: "public/typedoc",
  readme: "none",
};

export default config;
